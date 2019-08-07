import { responseSuccess, throwError } from '../support';
import logger from '../config/logger';
import { EventEmitter } from 'events';
import { Company } from '../entity/Company';
import CustomerToken, { CustomerData } from './tokens/CustomerToken';

export interface CustomerInformation {
    id: string;
    name: string;
}

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'connect', listener: (data: { ctoken: CustomerToken }) => void): void;
}

interface Data {
    mapCustomers: Map<string, CustomerToken>;
    company: Company;
    nsp: ICustomer.Socket.Namespace;
}

export default class CustomerService extends EventEmitter {
    public on!: ListenerEvents<this>;

    private data: Data;

    get customers() {
        return Array.from(this.data.mapCustomers.values());
    }

    constructor(company: Company, nsp: ICustomer.Socket.Namespace) {
        super();
        this.data = {
            mapCustomers: new Map(),
            company,
            nsp,
        };

        nsp.on('connect', async (socket: ICustomer.Socket) => {
            const key: string = socket.handshake.query.key || null;
            const name: string = socket.handshake.query.name || '';

            const ctoken = await this.findOrGenerateCustomerToken(socket, { key, name, companyId: company.id });

            socket.on('disconnect', () => {
                ctoken.onDisconnect();
            });

            this.emit('connect', { ctoken });

            socket.emit('customer-key', { key: ctoken.customer.key });
            logger.error('key ==== ', key, ', response ==== ', ctoken.customer.key);
        });
    }

    public getCustomer(id: string) {
        return this.data.mapCustomers.get(id);
    }

    public async findOrGenerateCustomerToken(socket: ICustomer.Socket, data: CustomerData) {
        const find = this.data.mapCustomers.get(data.key);
        if (find) {
            await find.reconnect(socket);
            return find;
        }

        const ctoken = await CustomerToken.createCustomerToken(socket, data);
        this.data.mapCustomers.set(ctoken.customer.key, ctoken);
        ctoken.on('destroy', () => {
            this.data.mapCustomers.delete(ctoken.customer.key);
        });

        return ctoken;
    }
}
