import { EventEmitter } from 'events';
import { Company } from '../entity/Company';

interface ListenerEvents<T> {
    (name: string, listener: () => void): T;
    (name: 'save.after', listener: (data: Company) => void): T;
    // tslint:disable-next-line:unified-signatures
    (name: 'delete.after', listener: (data: Company) => void): T;
}

interface EmitterEvents {
    (name: string, data: any): boolean;
    (name: 'save.after', data: Company): boolean;
    // tslint:disable-next-line:unified-signatures
    (name: 'delete.after', data: Company): boolean;
}

class EventCompany extends EventEmitter {
    public on!: ListenerEvents<this>;
    public emit!: EmitterEvents;
}

export const eventCompany = new EventCompany();
