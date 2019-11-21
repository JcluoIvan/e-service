import { User, UserRole } from '../entity/User';
import { getConnection } from 'typeorm';
import { LoginFailedError, UserDisabledError } from '../exceptions/login.errors';
import { responseSuccess, throwError } from '../support';
import logger from '../config/logger';
import { EventEmitter } from 'events';
import UserToken from './tokens/UserToken';
import { Company } from '../entity/Company';
import * as moment from 'moment';
import { ResponseCode } from '../exceptions';
import { eventUser } from '../events/event-user';
import { SystemConfig } from '../entity/SystemConfig';
import { eventSystemConfig } from '../events/event-system-config';

// interface EmitterEvents {
//     (event: string | symbol, ...args: any[]): boolean;
//     (event: 'login', data: { utoken: UserToken }): boolean;
// }

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'connect', listener: (data: { utoken: UserToken }) => void): T;
}

const findByUsername = async (companyId: number, username: string) => {
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
    systemConfig: SystemConfig;
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

    get systemConfig() {
        return this.data.systemConfig;
    }

    constructor(company: Company, nsp: IUser.Socket.Namespace) {
        super();
        this.data = {
            users: new Map<number, UserToken>(),
            nsp,
            company,
            systemConfig: SystemConfig.newSystemConfig(company.id),
        };
        this.reloadSystemConfig();

        this.nsp.on('connect', async (socket: IUser.Socket) => {
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

        /* listener 登出事件 (包含修改密碼、修改啟/停用) */
        eventUser.on('logout', (user) => {
            const find = this.findById(user.id);
            console.info(user.id, user.username);
            if (find) {
                find.logout();
                find.destroy();
            }
        });

        eventSystemConfig.on('save.after', (config) => {
            this.data.systemConfig = config;
        });
    }

    public findById(id: number) {
        return this.data.users.get(id);
    }

    public findByToken(token: string) {
        return this.users.find((u) => u.token === token) || null;
    }

    public async reloadSystemConfig() {
        const config = await getConnection()
            .createQueryBuilder(SystemConfig, 'sc')
            .where('company_id = :cid', { cid: this.company.id })
            .getOne();
        this.data.systemConfig = config || SystemConfig.newSystemConfig(this.company.id);
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
        if (data.username) {
            const find = this.users.find((u) => u.user.username === data.username);
            logger.error(find);
            if (find) {
                await find.login(socket, data.password || '');
                return find;
            }

            const user = await findByUsername(this.company.id, data.username);
            if (!user) {
                throw new LoginFailedError();
            }

            const utoken = new UserToken(user);
            await utoken.login(socket, data.password || '');
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
