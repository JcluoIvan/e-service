import { User } from '../../entity/User';
import {
    AssignUserTokenError,
    UserNotFoundError,
    LoginFailedError,
    UserDisabledError,
    UserErrorLockedError,
} from '../../exceptions/login.errors';
import * as md5 from 'md5';
import { getConnection } from 'typeorm';
import { SocketUndefinedError } from '../../exceptions/token.error';
import logger from '../../config/logger';
import { EventEmitter } from 'events';
import { clearTimeout, setTimeout } from 'timers';
import { LogUserLogin, LoginStatus } from '../../entity/LogUserLogin';
import { ipAddress } from '../../support';
import moment = require('moment');
import browserInfo from '../../support/browserInfo';
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

    public async reloadUser(socket: IUser.Socket) {
        await this.data.user.reload();

        if (this.user.isErrorLocked) {
            throw new UserErrorLockedError();
        }

        if (!this.user.enabled) {
            await this.onFailed(socket, '已被停用');
            throw new UserDisabledError();
        }


    }

    public async login(socket: IUser.Socket, password: string) {
        await this.reloadUser(socket);
        if (!this.user.checkPassword(password)) {
            await this.onFailed(socket, '密碼不正確');
            logger.error('error password');
            throw new LoginFailedError();
        }

        if (this.isOnline) {
            socket.emit('message/error', { message: '重複登入' });
            socket.disconnect();
        }
        this.data.socket = socket;

        this.data.token = this.generateToken(this.user);
        this.onSuccess();

        this.emit('connected');
        this.clearDestroyTime();
        return this.token;
    }

    public async reconnect(socket: IUser.Socket, token: string) {
        await this.reloadUser(socket);

        if (token && token !== this.data.token) {
            return false;
        }

        await this.data.user.reload();

        if (this.isOnline) {
            socket.emit('message/error', { message: '重複登入' });
            socket.disconnect();
        }

        this.data.socket = socket;
        this.onSuccess();

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

    private async onSuccess() {
        this.socket.on('disconnect', () => this.onDisconnected());

        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        const ip = ipAddress(this.socket.handshake);
        const userAgent = this.socket.handshake.headers.userAgent || '';
        const info = browserInfo(this.socket.handshake.headers);
        this.data.user.updatedAt = now;
        this.data.user.loginErrors = 0;
        logger.error(this.data.user.updatedAt);
        await this.data.user.save();

        const log = new LogUserLogin();
        log.companyId = this.user.companyId;
        log.userId = this.user.id;
        log.ip = ip;
        log.message = '';
        log.userAgent = userAgent;
        log.device = info.device;
        log.browser = `${info.browser} (${info.version})`;
        log.os = `${info.os}(${info.osVersion})`;
        log.status = LoginStatus.Success;
        log.createdAt = now;
        await log.save();
    }

    private async onFailed(socket: IUser.Socket, message: string) {
        // this.data.user.ip = ip;
        // await this.data.user.save();

        const ip = ipAddress(socket.handshake);
        const userAgent = socket.handshake.headers.userAgent || '';
        const info = browserInfo(socket.handshake.headers);
        const now = moment().format('YYYY-MM-DD HH:mm:ss');

        this.data.user.updatedAt = now;
        this.data.user.loginErrors = this.data.user.loginErrors + 1;
        await this.data.user.save();

        const log = new LogUserLogin();
        log.companyId = this.user.companyId;
        log.userId = this.data.user.id;
        log.ip = ipAddress(socket.handshake);
        log.message = message;
        log.userAgent = userAgent;
        log.device = info.device;
        log.browser = `${info.browser} (${info.version})`;
        log.os = `${info.os}(${info.osVersion})`;
        log.status = LoginStatus.Failed;
        log.createdAt = now;
        await log.save();
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
