import { CustomerItem } from '../CustomerService';
import logger from '../../logger';
import { runInThisContext } from 'vm';
import { UserItem } from '../UserService';
import { getConnection } from 'typeorm';

let autoincrement = 0;

interface Data {
    id: number;
    createdAt: number;

    /* 專員 */
    uitem: UserItem | null;

    /* 顧客 */
    citem: CustomerItem;

    /* 鎖定, 由 watcher 操作, 鎖定後專員無法發話 */
    locked: boolean;

    /* 觀查者 */
    watcher: UserItem[];

    messages: ITask.Message[];
}

export default class Task {
    private data: Data;

    constructor(customer: CustomerItem) {
        this.data = {
            id: ++autoincrement,
            createdAt: new Date().getTime(),
            citem: customer,
            uitem: null,
            locked: false,
            watcher: [],
            messages: [],
        };
        logger.info('create task');
        const t = customer.socket.on('send', this.fromCustomerMessage);
        // customer.socket.on('send', (data, res) => {
        //     const time = new Date().getTime();
        //     const msg = { ...data, time };
        //     this.fromCustomerMessage(msg);
        //     res(time);
        //     logger.info(data);
        // });

        customer.socket.on('unbind', () => {
            customer.socket.removeListener('send', this.fromCustomerMessage);
            logger.info('leave');
        });
        // this.socket.join(this.roomName);
    }

    get id() {
        return this.data.id;
    }

    get createdAt() {
        return this.data.createdAt;
    }

    get socket() {
        return this.data.citem.socket;
    }

    private fromCustomerMessage = (data: ITask.Message, res: (time: number) => void) => {
        const time = new Date().getTime();
        const msg = { ...data, time };
        if (this.data.uitem) {
            this.data.uitem.socket.emit('send', msg);
        }

        this.data.watcher.forEach((w) => {
            w.socket.emit('send', msg);
        });
        res(time);
        logger.info(data);
    };

    private fromUserMessage(msg: ITask.Message, from: IUser.Socket.Socket) {
        const sockets: IUser.Socket.Socket[] = [...this.data.watcher.map((w) => w.socket)];
        if (this.data.uitem) {
            sockets.push(this.data.uitem.socket);
        }
        this.socket.emit('send', msg);
        sockets.forEach((s) => {
            if (s !== from) {
                s.emit('send', msg);
            }
        });
    }
}
