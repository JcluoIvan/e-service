import { EventEmitter } from 'events';
import { User } from '../entity/User';

interface ListenerEvents<T> {
    (name: string, listener: () => void): T;
    (name: 'save.after', listener: (data: User) => void): T;
    // tslint:disable-next-line:unified-signatures
    (name: 'delete.after', listener: (data: User) => void): T;
    // tslint:disable-next-line:unified-signatures
    (name: 'logout', listener: (data: User) => void): T;
}

interface EmitterEvents {
    (name: string, data: any): boolean;
    (name: 'save.after', data: User): boolean;
    // tslint:disable-next-line:unified-signatures
    (name: 'delete.after', data: User): boolean;
    // tslint:disable-next-line:unified-signatures
    (name: 'logout', data: User): boolean;
}

class EventUser extends EventEmitter {
    public on!: ListenerEvents<this>;
    public emit!: EmitterEvents;
}

export const eventUser = new EventUser();
