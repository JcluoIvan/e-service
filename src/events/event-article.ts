import { EventEmitter } from 'events';
import { Article } from '../entity/Article';

interface ListenerEvents<T> {
    (name: string, listener: () => void): T;
    (name: 'save.after', listener: (data: Article) => void): T;
    // tslint:disable-next-line:unified-signatures
    (name: 'delete.after', listener: (data: Article) => void): T;
}

interface EmitterEvents {
    (name: string, data: any): boolean;
    (name: 'save.after', data: Article): boolean;
    // tslint:disable-next-line:unified-signatures
    (name: 'delete.after', data: Article): boolean;
}

class EventArticle extends EventEmitter {
    public on!: ListenerEvents<this>;
    public emit!: EmitterEvents;
}

export const eventArticle = new EventArticle();
