import { User, UserRole } from '../entity/User';
import { getConnection } from 'typeorm';
import { LoginFailedError } from '../exceptions/login.errors';
import { responseSuccess, socketEventMiddleware, throwError } from '../support';
import logger from '../logger';
import { EventEmitter } from 'events';
import UserToken from './tokens/UserToken';
import { Company } from '../entity/Company';
import * as moment from 'moment';

// interface EmitterEvents {
//     (event: string | symbol, ...args: any[]): boolean;
//     (event: 'login', data: { utoken: UserToken }): boolean;
// }

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'connect', listener: (data: { utoken: UserToken }) => void): void;
}

const findByUsername = async (companyId: number, username: string) => {
    return await getConnection()
        .getRepository(User)
        .createQueryBuilder('user')
        .where('company_id = :companyId AND username = :username', { username, companyId })
        .getOne();
};

interface Data {
    users: Map<number, UserToken>;
    company: Company;
    nsp: IUser.Socket.Namespace;
}

export default class UserService extends EventEmitter {
    public on!: ListenerEvents<this>;
    // public emit!: EmitterEvents;
    private data!: Data;

    get users() {
        return Array.from(this.data.users.values());
    }

    get company() {
        return this.data.company;
    }

    get nsp() {
        return this.data.nsp;
    }

    constructor(company: Company, nsp: IUser.Socket.Namespace) {
        super();
        this.data = {
            users: new Map<number, UserToken>(),
            nsp,
            company,
        };

        nsp.on('connect', async (socket: IUser.Socket) => {
            logger.info('connect');

            /* middleware - handle error */
            // const socket: IUser.Socket.Socket = socketEventMiddleware<IUser.Socket.Socket>(
            //     originSocket,
            //     async (response, next) => {
            //         try {
            //             response(responseSuccess(await next()));
            //         } catch (err) {
            //             logger.error(`Error: ${err.message}`);
            //             response(throwError(err));
            //         }
            //     },
            // );
            try {
                const token = socket.handshake.query.token || '';
                logger.warn(token);
                if (token) {
                    const utoken = await this.reconnect(token, socket);
                    if (utoken) {
                        socket.emit('login', {
                            id: utoken.user.id,
                            username: utoken.user.username,
                            name: utoken.user.name,
                            role: utoken.user.role,
                            token: utoken.token,
                            loginAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                        });
                        logger.info('send login');
                        this.emit('connect', { utoken });
                    }
                }
            } catch (err) {
                logger.error(err);
            }

            socket.on('login', async ({ username, password }, res) => {
                logger.info('login');

                try {
                    const utoken = await this.findOrGenerateUserToken(username);
                    const isLogin = await utoken.login(socket, password);
                    if (!isLogin) {
                        res(throwError(new LoginFailedError()));
                        return;
                    }

                    socket.on('disconnect', () => {
                        utoken.onDisconnected();
                    });

                    const resData: IUser.Socket.ListenerData.Login.Response = {
                        id: utoken.user.id,
                        username: utoken.user.username,
                        role: utoken.user.role,
                        name: utoken.user.name,
                        token: utoken.token || '',
                        loginAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                    };
                    res(responseSuccess(resData));
                    this.emit('connect', { utoken });
                } catch (err) {
                    logger.error(`Error: ${err.message}`);
                    res(throwError(err));
                }
            });
        });
    }
    public getUserToken(id: number) {
        return this.data.users.get(id);
    }

    private async reconnect(token: string, socket: IUser.Socket) {
        const utoken = Array.from(this.users.values()).find((u) => u.token === token);
        if (!utoken) {
            logger.warn('not found utoken', token, this.users.map((o) => o.token));
            return false;
        }
        const res = await utoken.reconnect(socket, token);
        return res ? utoken : false;
    }

    private async findOrGenerateUserToken(username: string) {
        const find = this.users.find((u) => u.user.username === username);
        if (find) {
            return find;
        }

        const user = await findByUsername(this.company.id, username);

        if (!user) {
            throw new LoginFailedError();
        }

        const utoken = new UserToken(user);
        this.data.users.set(user.id, utoken);

        return utoken;
    }
}
