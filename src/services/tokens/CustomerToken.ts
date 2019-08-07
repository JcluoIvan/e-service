import { SocketUndefinedError } from '../../exceptions/token.error';
import * as md5 from 'md5';
import { clearTimeout, setTimeout } from 'timers';
import { EventEmitter } from 'events';
import { ipAddress } from '../../support';
import { getConnection } from 'typeorm';
import { Customer } from '../../entity/Customer';
import logger from '../../config/logger';

export interface CustomerData {
    companyId: number;
    key: string;
    name: string;
}

interface Data {
    customer: Customer;
    ip: string;
    socket: ICustomer.Socket | null;
}

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'disconnected' | 'destroy' | 'reconnected', listener: () => void): T;
}

/** 斷線後，session 保留時間 */
const DESTROY_DELAY = 10 * 1000; // 1 * 60 * 1000;

const generateToken = (ip: string) => {
    const now = new Date().getTime();
    const rand = Math.random();
    return md5(`${now}-${rand}-`);
};

export default class CustomerToken extends EventEmitter {
    get customer() {
        return this.data.customer;
    }

    get socket() {
        if (!this.data.socket) {
            throw new SocketUndefinedError();
        }
        return this.data.socket;
    }

    get ip() {
        return this.data.ip;
    }

    get isOnline() {
        return (this.data.socket && this.data.socket.connected) || false;
    }

    public static async createCustomerToken(socket: ICustomer.Socket, data: CustomerData) {
        logger.error('key = ', data.key);
        const find = data.key
            ? await getConnection()
                  .createQueryBuilder(Customer, 'customer')
                  .where('`key` = :key AND company_id = :companyId', { key: data.key, companyId: data.companyId })
                  .getOne()
            : null;
        if (find) {
            return new CustomerToken(socket, find);
        }

        const customerEntity = new Customer();
        customerEntity.companyId = data.companyId;
        customerEntity.key = data.key || generateToken(socket.handshake.address);
        customerEntity.name = data.name || 'guest';
        const res = await customerEntity.save();
        return new CustomerToken(socket, res);
    }
    public on!: ListenerEvents<this>;
    private data: Data;

    private destroyTimes: NodeJS.Timer | null = null;
    constructor(socket: ICustomer.Socket, customer: Customer) {
        super();
        this.data = {
            customer,
            socket,
            ip: ipAddress(socket.handshake.address),
        };
    }

    public async reconnect(socket: ICustomer.Socket) {
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
        this.data.ip = ipAddress(socket.handshake.address);
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
