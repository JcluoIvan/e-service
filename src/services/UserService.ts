import { User } from '../entity/User';
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
    (event: 'login', data: { socket: IUser.Socket.Socket; uitem: UserItem }): boolean;
}

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'login', listener: (data: { socket: IUser.Socket.Socket; uitem: UserItem }) => void): void;
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
                const user = await this.findUser(username);
                if (!user || user.checkPassword(password)) {
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
                this.emit('login', { socket, uitem });
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
        return await getConnection()
            .getRepository(User)
            .createQueryBuilder('user')
            .where('username = :username', { username })
            .getOne();
    }
}
