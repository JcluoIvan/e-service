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
    ready: boolean;
}

export default class ServiceRoom extends EventEmitter {
    public on!: ListenerEvents<this>;

    private data: Data;

    /** 是否開啟 (開啟狀態才能經由系統自動分配顧客) */

    get isOnline() {
        return this.data.utoken.isOnline;
    }

    get id() {
        return this.data.utoken.user.id;
    }

    get name() {
        return this.data.utoken.user.name;
    }

    get isReady() {
        return this.data.ready;
    }

    get utoken() {
        return this.data.utoken;
    }

    get nsp() {
        return this.utoken.socket.nsp;
    }

    constructor(utoken: UserToken) {
        super();
        this.data = {
            utoken,
            ready: false,
        };
    }

    public ready() {
        this.data.ready = true;
        this.nsp.emit('center/room-ready', { userId: this.id });
    }

    public unready() {
        this.data.ready = false;
        this.nsp.emit('center/room-unready', { userId: this.id });
    }

    public toJson(): IUser.Socket.EmitterData.Center.Room {
        const user = this.data.utoken.user;
        return {
            id: this.id,
            name: this.name,
            online: this.isOnline,
            ready: this.isReady,
        };
    }
}
