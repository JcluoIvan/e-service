import { User } from '../../entity/User';
import { AssignUserTokenError, UserNotFoundError, LoginFailedError } from '../../exceptions/login.errors';
import * as md5 from 'md5';
import { getConnection } from 'typeorm';
import { SocketUndefinedError } from '../../exceptions/token.error';
import logger from '../../config/logger';
import { EventEmitter } from 'events';
import { clearTimeout, setTimeout } from 'timers';
interface Data {
    user: User;
    socket: IUser.Socket | null;
    token: string | null;
}

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'connected', listener: () => void): T;
    // tslint:disable-next-line:unified-signatures
    (event: 'reconnected', listener: () => void): T;
    // tslint:disable-next-line:unified-signatures
    (event: 'disconnected', listener: () => void): T;
    // tslint:disable-next-line:unified-signatures
    (event: 'destroy', listener: () => void): T;
}

/** 斷線後，session 保留時間 */
const DESTROY_DELAY = 3 * 1000; // 1 * 60 * 1000;

export default class UserToken extends EventEmitter {
    public on!: ListenerEvents<this>;
    private surviveAt: number = 0;
    private data!: Data;
    private destroyTimes: NodeJS.Timer | null = null;

    constructor(socket: IUser.Socket, user: User) {
        super();
        this.data = {
            user,
            socket,
            token: this.generateToken(user),
        };
    }

    get isOnline() {
        return (this.data.socket && this.data.socket.connected) || false;
    }

    get socket() {
        if (!this.data.socket) {
            throw new SocketUndefinedError();
        }
        return this.data.socket;
    }

    get user() {
        return this.data.user;
    }

    get token() {
        return this.data.token;
    }

    public async login(socket: IUser.Socket, password: string) {
        await this.data.user.reload();

        if (!this.user.checkPassword(password)) {
            throw new LoginFailedError();
        }

        if (this.isOnline) {
            this.socket.emit('message/error', { message: '重複登入' });
            this.socket.disconnect();
        }
        this.data.socket = socket;

        this.data.token = this.generateToken(this.user);
        this.onConnected();

        this.emit('connected');
        this.clearDestroyTime();
        return this.token;
    }

    public async reconnect(socket: IUser.Socket, token: string) {
        if (token && token !== this.data.token) {
            logger.error('error token');
            return false;
        }

        await this.data.user.reload();

        if (this.isOnline) {
            this.socket.emit('message/error', { message: '重複登入' });
            this.socket.disconnect();
        }

        this.data.socket = socket;
        this.onConnected();

        this.emit('reconnected');
        this.clearDestroyTime();
        return this.token;
    }

    public logout() {
        this.data.token = null;
        this.socket.disconnect();
        return this;
    }

    public destroy() {
        this.emit('destroy');
        this.destroyTimes = null;
        this.removeAllListeners();
    }

    private onDisconnected() {
        // do something
        this.emit('disconnected');
        if (this.isOnline) {
            this.socket.disconnect();
        }
        this.clearDestroyTime();
        this.destroyTimes = setTimeout(() => {
            this.destroy();
        }, DESTROY_DELAY);
    }

    private onConnected() {
        this.socket.on('disconnect', () => this.onDisconnected());
    }

    private generateToken(user: User) {
        return md5(`${new Date().getTime()}:${user.id}:${user.username}`);
    }

    private clearDestroyTime() {
        if (this.destroyTimes) {
            clearTimeout(this.destroyTimes);
            this.destroyTimes = null;
        }
    }
}
