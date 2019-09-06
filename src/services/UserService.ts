import { User, UserRole } from '../entity/User';
import { getConnection } from 'typeorm';
import { LoginFailedError } from '../exceptions/login.errors';
import { responseSuccess, throwError } from '../support';
import logger from '../config/logger';
import { EventEmitter } from 'events';
import UserToken from './tokens/UserToken';
import { Company } from '../entity/Company';
import * as moment from 'moment';
import { ResponseCode } from '../exceptions';

// interface EmitterEvents {
//     (event: string | symbol, ...args: any[]): boolean;
//     (event: 'login', data: { utoken: UserToken }): boolean;
// }

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'connect', listener: (data: { utoken: UserToken }) => void): T;
}

const findByUsername = async (companyId: number, username: string) => {
    const selects = ['id', 'password', 'username', 'name', 'role', 'company_id'];
    return await getConnection()
        .createQueryBuilder(User, 'user')
        .addSelect('user.password')
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
            socket.on('login', async ({ username, password, token }, res) => {

                try {
                    const utoken = await this.findUserToken(socket, { username, password, token });

                    const resData: IUser.Socket.ListenerData.Login.Response = {
                        id: utoken.user.id,
                        username: utoken.user.username,
                        companyId: utoken.user.companyId,
                        imageUrl: utoken.user.imageUrl,
                        role: utoken.user.role,
                        name: utoken.user.name,
                        token: utoken.token || '',
                        loginAt: moment().format('YYYY-MM-DD HH:mm:ss'),
                    };
                    res(responseSuccess(resData));
                    this.emit('connect', { utoken });

                    this.broadcastUsers();
                } catch (err) {
                    logger.error(`Error: ${err.message}`, err);
                    res(throwError(err));
                }
            });

            socket.on('disconnect', () => {
                this.broadcastUsers();
            });
        });
    }

    public findById(id: number) {
        return this.data.users.get(id);
    }

    public findByToken(token: string) {
        return this.users.find((u) => u.token === token) || null;
    }

    private broadcastUsers() {
        const users: IUser.Socket.EmitterData.UserInfo[] = this.users.map((utoken) => {
            return {
                id: utoken.user.id,
                online: utoken.isOnline,
                username: utoken.user.username,
                name: utoken.user.name,
                imageUrl: utoken.user.imageUrl,
            };
        });

        this.nsp.emit('users', users);
    }

    private async findUserToken(socket: IUser.Socket, data: { username?: string; password?: string; token?: string }) {
        if (data.username && data.password) {
            const find = this.users.find((u) => u.user.username === data.username);
            if (find) {
                await find.login(socket, data.password);
                return find;
            }

            const user = await findByUsername(this.company.id, data.username);
            if (!user) {
                throw new LoginFailedError();
            }

            const utoken = new UserToken(socket, user);
            utoken.on('destroy', () => {
                this.data.users.delete(user.id);
            });
            this.data.users.set(user.id, utoken);
            return utoken;
        }

        if (data.token) {
            const utoken = this.users.find((u) => u.token === data.token);
            if (!utoken) {
                throw new LoginFailedError();
            }
            await utoken.reconnect(socket, data.token);
            return utoken;
        }

        throw new LoginFailedError();
    }
}
