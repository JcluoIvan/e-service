import { User, UserRole } from '../entity/User';
import { getConnection } from 'typeorm';
import { LoginFailedError } from '../exceptions/login.errors';
import { responseSuccess, socketEventMiddleware, throwError } from '../support';
import logger from '../logger';
import { EventEmitter } from 'events';

export interface UserItem {
    user: User;
    socket: IUser.Socket.Socket;
}

interface EmitterEvents {
    (event: string | symbol, ...args: any[]): boolean;
    (event: 'login', data: { uitem: UserItem }): boolean;
}

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'login', listener: (data: { uitem: UserItem }) => void): void;
}

export default class UserService extends EventEmitter {
    public on!: ListenerEvents<this>;
    public emit!: EmitterEvents;
    private users = new Map<number, UserItem>();

    constructor(private nspUser: IUser.Socket.Namespace) {
        super();

        this.nsp.on('connect', async (originSocket) => {
            logger.info('connect');
            /* middleware - handle error */
            const socket: IUser.Socket.Socket = socketEventMiddleware<IUser.Socket.Socket>(
                originSocket,
                async (response, next) => {
                    try {
                        response(responseSuccess(await next()));
                    } catch (err) {
                        logger.error(`Error: ${err.message}`);
                        response(throwError(err));
                    }
                },
            );

            socket.on('login', async ({ username, password }, res) => {
                logger.info('login');
                try {
                    const user = await this.findUser(username);
                    if (!user || !user.checkPassword(password)) {
                        res(throwError(new LoginFailedError()));
                        return;
                    }

                    const existsUser = this.users.get(user.id);
                    if (existsUser) {
                        existsUser.socket.disconnect();
                    }

                    const uitem = {
                        user,
                        socket,
                    };

                    this.users.set(user.id, uitem);

                    socket.on('disconnect', () => {
                        this.users.delete(user.id);
                    });
                    const resData: IUser.Socket.ListenerData.Login.Response = {
                        id: user.id,
                        role: user.role,
                        name: user.name,
                    };
                    res(responseSuccess(resData));
                    this.emit('login', { uitem });
                } catch (err) {
                    logger.error(`Error: ${err.message}`);
                    res(throwError(err));
                }
            });
        });
    }

    get nsp() {
        return this.nspUser;
    }
    public getUser(id: number) {
        return this.users.get(id);
    }
    private async findUser(username: string) {
        const user = new User();
        user.id = 1;
        user.username = username;
        user.password = 'ivan';
        user.name = 'ivna';
        user.role = UserRole.Supervisor;
        return Promise.resolve(user);

        // return await getConnection()
        //     .getRepository(User)
        //     .createQueryBuilder('user')
        //     .where('username = :username', { username })
        //     .getOne();
    }
}
