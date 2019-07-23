import { SocketUndefinedError } from '../../exceptions/token.error';
import * as md5 from 'md5';
import { clearTimeout, setTimeout } from 'timers';
import { EventEmitter } from 'events';

export interface CustomerData {
    id: string;
    name: string;
}

interface Data {
    customer: CustomerData;
    token: string;
    socket: ICustomer.Socket | null;
}

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'disconnected' | 'distory' | 'reconnected', listener: () => void): T;
}

const generateToken = (name: string) => {
    const now = new Date().getTime();
    const rand = Math.random();
    return md5(`${now}-${rand}-${name}`);
};

/** 斷線後，資料保留時間 */
const DESTROY_DELAY = 2 * 60 * 1000;

export default class CustomerToken extends EventEmitter {
    public on!: ListenerEvents<this>;
    private data: Data;

    private destroyTimes: NodeJS.Timer | null = null;

    get customer() {
        return this.data.customer;
    }

    get socket() {
        if (!this.data.socket) {
            throw new SocketUndefinedError();
        }
        return this.data.socket;
    }

    get token() {
        return this.data.token;
    }

    get isOnline() {
        return (this.data.socket && this.data.socket.connected) || false;
    }

    constructor(customer: CustomerData) {
        super();
        this.data = {
            customer: { ...customer },
            token: generateToken(customer.name),
            socket: null,
        };
    }

    public async connect(socket: ICustomer.Socket) {
        if (this.isOnline) {
            this.socket.emit('message/error', { message: '重複登入' });
            this.socket.disconnect();
        }

        /** 若 destroy 代表已斷, 等待重連 */
        if (this.destroyTimes) {
            this.emit('reconnected');
            this.clearDestroyTimer();
        }
        this.data.socket = socket;
    }

    public destroy() {
        this.emit('destroy');
        this.destroyTimes = null;
        this.removeAllListeners();
    }

    public onDisconnect() {
        if (this.isOnline) {
            this.socket.disconnect();
        }
        this.clearDestroyTimer();
        this.emit('disconnected');
        this.destroyTimes = setTimeout(() => {
            this.destroy();
        }, DESTROY_DELAY);
    }

    private clearDestroyTimer() {
        if (this.destroyTimes) {
            clearTimeout(this.destroyTimes);
            this.destroyTimes = null;
        }
    }
}
