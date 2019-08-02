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
            const id: string = socket.handshake.query.id || null;
            const name: string = socket.handshake.query.name || '';
            const token: string = socket.handshake.query.token || '';

            const ctoken = await this.findOrGenerateCustomerToken({ id, name }, token);

            await ctoken.connect(socket);

            socket.on('disconnect', () => {
                ctoken.onDisconnect();
            });
            this.emit('connect', { ctoken });

            socket.emit('token', { token: ctoken.token });
        });
    }

    public getCustomer(id: string) {
        return this.data.mapCustomers.get(id);
    }

    public async findOrGenerateCustomerToken(cdata: CustomerData, token: string) {
        if (token) {
            const find = this.customers.find((c) => !c.isOnline && c.token === token);

            if (find) {
                return find;
            }
        }
        logger.warn(token, this.customers.map((o) => o.token));

        const ctoken = new CustomerToken(cdata);
        this.data.mapCustomers.set(ctoken.token, ctoken);
        ctoken.on('destroy', () => {
            this.data.mapCustomers.delete(ctoken.token);
        });

        return ctoken;
    }
}
