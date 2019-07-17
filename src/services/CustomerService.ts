import { socketEventMiddleware, responseSuccess, throwError } from '../support';
import logger from '../logger';
import { EventEmitter } from 'events';

export interface CustomerInformation {
    id: string;
    name: string;
}

export interface CustomerItem {
    token: string;
    info: CustomerInformation;
    socket: ICustomer.Socket.Socket;
}

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'login', listener: (data: { socket: IUser.Socket.Socket; citem: CustomerItem }) => void): void;
}

interface EmitterEvents {
    (event: string | symbol, ...args: any[]): boolean;
    (event: 'login', data: { socket: IUser.Socket.Socket; citem: CustomerItem }): boolean;
}

export default class CustomerService extends EventEmitter {
    public on!: ListenerEvents<this>;
    public emit!: EmitterEvents;
    private customers = new Map<string, CustomerItem>();

    constructor(nsp: ICustomer.Socket.Namespace) {
        super();

        nsp.on('connect', async (originSocket: ICustomer.Socket.Socket) => {
            const token: string = originSocket.handshake.query.token;
            const info = {
                id: originSocket.handshake.query.id,
                name: originSocket.handshake.query.name,
            };

            if (!token) {
                originSocket.disconnect();
                return;
            }

            const socket: ICustomer.Socket.Socket = socketEventMiddleware<ICustomer.Socket.Socket>(
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
            const existsCustomer = this.customers.get(token);
            if (existsCustomer) {
                existsCustomer.socket.disconnect();
            }

            const customer = {
                token,
                socket,
                info,
            };
            this.customers.set(token, customer);
            socket.on('disconnect', () => {
                this.customers.delete(token);
            });

            this.events.emit('connect', { socket, token });
        });
    }

    public getCustomer(token: string) {
        return this.customers.get(token);
    }
}
