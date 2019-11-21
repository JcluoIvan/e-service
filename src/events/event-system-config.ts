import { EventEmitter } from 'events';
import { SystemConfig } from '../entity/SystemConfig';

interface ListenerEvents<T> {
    (name: string, listener: () => void): T;
    (name: 'save.after', listener: (data: SystemConfig) => void): T;
}

interface EmitterEvents {
    (name: string, data: any): boolean;
    (name: 'save.after', data: SystemConfig): boolean;
}

class EventSystemConfig extends EventEmitter {
    public on!: ListenerEvents<this>;
    public emit!: EmitterEvents;
}

export const eventSystemConfig = new EventSystemConfig();
