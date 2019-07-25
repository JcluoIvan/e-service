import { User } from '../../entity/User';
import { AssignUserTokenError, UserNotFoundError, LoginFailedError } from '../../exceptions/login.errors';
import * as md5 from 'md5';
import { getConnection } from 'typeorm';
import { SocketUndefinedError } from '../../exceptions/token.error';
import logger from '../../logger';
import { EventEmitter } from 'events';
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
}

export default class UserToken extends EventEmitter {
    public on!: ListenerEvents<this>;
    private surviveAt: number = 0;
    private data!: Data;

    constructor(user: User) {
        super();
        this.data = {
            user,
            socket: null,
            token: null,
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

        this.generateToken();
        this.onConnected();

        this.emit('connected');
        return this.token;
    }

    public async reconnect(socket: IUser.Socket, token: string) {
        if (token && token !== this.data.token) {
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
        return this.token;
    }

    public logout() {
        this.data.token = null;
        this.socket.disconnect();
    }

    private onDisconnected() {
        // do something
        this.emit('disconnected');
    }

    private onConnected() {
        this.socket.on('disconnect', () => this.onDisconnected());
    }

    private generateToken() {
        this.data.token = md5(`${new Date().getTime()}:${this.user.id}:${this.user.username}`);
        return this.data.token;
    }
}
