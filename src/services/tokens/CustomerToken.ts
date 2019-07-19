import { SocketUndefinedError } from '../../exceptions/token.error';
import { runInThisContext } from 'vm';
import * as md5 from 'md5';
import { clearTimeout, setTimeout } from 'timers';
import { EventEmitter } from 'events';

export interface CustomerData {
    id: string;
    name: string;
}

interface Data {
    customer: CustomerData;
    socket: ICustomer.Socket | null;
}

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'destroy', listener: () => void): T;
}

const generateToken = (name: string) => {
    const now = new Date().getTime();
    const rand = Math.random();
    return md5(`${now}-${rand}-${name}`);
};

/** 斷線後，資料保留時間 */
const DESTROY_DELAY = 5 * 60 * 1000;

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

    get isOnly() {
        return this.data.socket && this.data.socket.connected;
    }

    constructor(customer: CustomerData) {
        super();
        const id = customer.id || generateToken(customer.name);

        this.data = {
            customer: { ...customer, id },
            socket: null,
        };
    }

    public async connect(socket: ICustomer.Socket) {
        if (this.isOnly) {
            this.socket.emit('message/error', { message: '重複登入' });
            this.socket.disconnect();
        }
        this.data.socket = socket;
    }

    public onDisconnect() {
        if (this.isOnly) {
            this.socket.disconnect();
        }
        this.clearDestroyTimer();
        this.destroyTimes = setTimeout(() => {
            this.emit('destroy');
        }, DESTROY_DELAY);
    }

    private clearDestroyTimer() {
        if (this.destroyTimes) {
            clearTimeout(this.destroyTimes);
            this.destroyTimes = null;
        }
    }
}
