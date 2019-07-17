import { CustomerItem } from '../CustomerService';
import logger from '../../logger';
import { runInThisContext } from 'vm';
import { UserItem } from '../UserService';
import { getConnection } from 'typeorm';
import { watch } from 'fs';
import { EventEmitter } from 'events';

let autoincrement = 0;

interface Data {
    id: number;
    createdAt: number;

    /* 專員 */
    executive: UserItem | null;

    /* 顧客 */
    customer: CustomerItem;

    /* 鎖定, 由 watcher 操作, 鎖定後專員無法發話 */
    locked: boolean;

    /* 觀查者 */
    watcher: UserItem[];

    /* 是否已關閉 */
    closed: boolean;
}

interface EmitterEvents {
    (event: string | symbol, ...args: any[]): boolean;
    (event: 'close', task: Task): boolean;
}
interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'close', listener: (task: Task) => void): T;
}

export default class Task extends EventEmitter {
    public emit!: EmitterEvents;
    public on!: ListenerEvents<this>;
    private data: Data;

    constructor(customer: CustomerItem) {
        super();
        this.data = {
            id: ++autoincrement,
            createdAt: new Date().getTime(),
            customer,
            executive: null,
            locked: false,
            watcher: [],
            closed: false,
        };
        // this.socket.join(this.roomName);
    }

    get id() {
        return this.data.id;
    }

    get createdAt() {
        return this.data.createdAt;
    }

    get socket() {
        return this.data.customer.socket;
    }

    get allUsers() {
        const { executive, watcher } = this.data;
        return executive ? [executive, ...watcher] : [...watcher];
    }

    public hasUser(userId: number) {
        const { watcher, executive } = this.data;
        return (executive && executive.user.id === userId) || watcher.some((w) => w.user.id === userId);
    }

    public sendMessage(data: MySocket.ListenerData.Message.Request) {
        const time = new Date().getTime();
        const resMsg: MySocket.EmitterData.Message = {
            id: new Date().getTime(),
            ...data,
            time,
        };

        this.socket.emit('center/send', resMsg);

        this.allUsers.forEach((u) => {
            u.socket.emit('center/send', resMsg);
        });

        return time;
    }

    public joinWatcher(uitem: UserItem) {
        this.data.watcher.push(uitem);
        const data: MySocket.EmitterData.CenterJoin = {
            taskId: this.id,
            user: {
                id: uitem.user.id,
                name: uitem.user.name,
            },
        };
        this.socket.emit('center/join', data);
        this.allUsers.forEach((u) => {
            u.socket.emit('center/join', data);
        });
    }

    public leaveWatcher(uitem: UserItem) {
        const data: MySocket.EmitterData.CenterLeave = {
            taskId: this.id,
            userId: uitem.user.id,
        };
        this.socket.emit('center/leave', data);
        this.allUsers.forEach((u) => {
            u.socket.emit('center/leave', data);
        });
    }

    public close() {
        this.data.closed = true;
        this.allUsers.forEach(({ socket }) => {
            socket.emit('center/close', this.id);
        });
        this.emit('close', this);
    }
}
