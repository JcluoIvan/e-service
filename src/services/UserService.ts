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

export default class UserService {
    public events = new EventEmitter();
    public on: IUser.UserServiceEvents.Listener = this.events.on;
    private users = new Map<number, UserItem>();

    constructor(private nspUser: IUser.Socket.Namespace) {
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

                const userItem = {
                    user,
                    socket,
                };

                this.users.set(user.id, userItem);

                socket.on('disconnect', () => {
                    this.users.delete(user.id);
                });

                this.events.emit('login', { socket, user });
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
