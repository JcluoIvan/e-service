import { UserItem } from '../UserService';
import ServiceTask from './ServiceTask';
import { EventEmitter } from 'events';
import * as moment from 'moment';
import { RoomDisconnectError } from '../../exceptions/center.error';
import { User } from '../../entity/User';

interface EmitterEvents {
    (event: string | symbol, ...args: any[]): boolean;
    (event: 'ready' | 'unready' | 'connect' | 'disconnect'): boolean;
    (event: 'add-task', data: ServiceTask): boolean;
}
interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'ready' | 'unready' | 'connect' | 'disconnect', listener: () => void): T;
    (event: 'add-task', listener: (task: ServiceTask) => void): T;
}

interface Data {
    socket: IUser.Socket.Socket | null;
    id: number;
    name: string;
}

export default class ServiceRoom extends EventEmitter {
    public serviceTasks: ServiceTask[] = [];
    public on!: ListenerEvents<this>;
    public emit!: EmitterEvents;
    private uitem: UserItem | null = null;

    private data: Data = {
        socket: null,
        id: 0,
        name: '',
    };

    /** 是否開啟 (開啟狀態才能經由系統自動分配顧客) */
    private ready = false;

    get id() {
        return this.user.id;
    }

    get isOnly() {
        return this.data.socket;
    }

    get user() {
        return this.data;
    }

    get tasks() {
        return this.serviceTasks;
    }

    constructor(user: User) {
        super();
        this.data.id = user.id;
        this.data.name = user.name;
    }

    public turnOnReady() {
        this.ready = true;
        this.emit('ready');
    }

    public turnOffReady() {
        this.ready = false;
        this.emit('unready');
    }

    public addTask(task: ServiceTask) {
        if (!this.uitem) {
            throw new RoomDisconnectError();
        }

        this.serviceTasks.push(task);

        task.on('close', () => {
            this.serviceTasks = this.serviceTasks.filter((t) => t !== task);
        });

        task.start(this.uitem);

        this.emit('add-task', task);
    }

    public connect(uitem: UserItem) {
        this.data.socket = uitem.socket;
        this.data.name = uitem.user.name;
        this.emit('connect');
    }

    /** 專員離線, 關閉房間 */
    public disconnect() {
        this.ready = false;
        this.data.socket = null;
        this.emit('disconnect');
    }

    public toJson(): IUser.Socket.EmitterData.Center.Room {
        const user = this.user;
        return {
            id: this.id,
            ready: this.ready,
            tasks: this.serviceTasks.map((t) => t.toJson()),
            user: {
                id: user.id,
                name: user.name,
            },
        };
    }
}
