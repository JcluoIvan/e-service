import ServiceTask from './ServiceTask';
import { EventEmitter } from 'events';
import * as moment from 'moment';
import { RoomDisconnectError } from '../../exceptions/center.error';
import { User } from '../../entity/User';
import UserToken from '../tokens/UserToken';

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'ready' | 'unready' | 'connect' | 'disconnect' | 'reconnect', listener: () => void): T;
    (event: 'add-task', listener: (data: { task: ServiceTask }) => void): T;
    // tslint:disable-next-line:unified-signatures
    (event: 'remove-task', listener: (data: { task: ServiceTask }) => void): T;
}

interface Data {
    utoken: UserToken;
    tasks: ServiceTask[];
}

export default class ServiceRoom extends EventEmitter {
    public on!: ListenerEvents<this>;

    private data: Data;

    /** 是否開啟 (開啟狀態才能經由系統自動分配顧客) */
    private ready = false;

    get isOnly() {
        return this.data.utoken.isOnline;
    }

    get tasks() {
        return this.data.tasks;
    }

    get id() {
        return this.data.utoken.user.id;
    }

    get name() {
        return this.data.utoken.user.name;
    }

    constructor(utoken: UserToken) {
        super();
        this.data = {
            utoken,
            tasks: [],
        };
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
        this.data.tasks.push(task);
        task.start(this.data.utoken);
        this.emit('add-task', {task});
    }

    public removeTask(task: ServiceTask) {
        this.data.tasks = this.data.tasks.filter((t) => t !== task);
    }

    public connect(utoken: UserToken) {
        // this.data.socket = utoken.socket;
        // this.data.name = utoken.user.name;
        this.emit('connect');
    }

    /** 專員離線, 關閉房間 */
    public disconnect() {
        this.turnOffReady();
        this.emit('disconnect');
    }

    public toJson(): IUser.Socket.EmitterData.Center.Room {
        const user = this.data.utoken.user;
        return {
            id: this.id,
            name: this.name,
            ready: this.ready,
        };
    }
}
