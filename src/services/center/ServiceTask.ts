import { CustomerItem } from '../CustomerService';
import logger from '../../logger';
import { UserItem } from '../UserService';
import { EventEmitter } from 'events';
import { Task } from '../../entity/Task';
import * as moment from 'moment';
import * as md5 from 'md5';
import { Message, MessageType } from '../../entity/Message';
import { NotInTaskError } from '../../exceptions/center.error';
import * as fs from 'fs';
import * as path from 'path';

type CacheMessage = MySocket.EmitterData.Message;

interface EmitterEvents {
    (event: string | symbol, ...args: any[]): boolean;
    (event: 'close', task: ServiceTask): boolean;
}
interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'close', listener: (task: ServiceTask) => void): T;
}

/**
 * 服務任務
 */
export default class ServiceTask extends EventEmitter {
    get id() {
        return this.task.id;
    }

    get customerId() {
        return this.task.customerId;
    }

    get customerName() {
        return this.task.customerName;
    }

    get createdAt() {
        return this.task.createdAt;
    }

    get allUsers() {
        const { executive, watchers } = this;
        return executive ? [executive, ...watchers] : [...watchers];
    }

    /**
     * 建立任務
     * @param customer 顧客連線資訊
     */
    public static async createTask(customer: CustomerItem) {
        const createdAt = moment();
        const taskEntity = new Task();
        taskEntity.executiveId = 0;
        taskEntity.customerId = customer.info.id;
        taskEntity.customerName = customer.info.name;
        taskEntity.createdAt = createdAt.format('YYYY-MM-DD HH:mm:ss');

        const task = await taskEntity.save();

        return new ServiceTask(customer, task);
    }
    public emit!: EmitterEvents;
    public on!: ListenerEvents<this>;

    /** 只保留 message 的 n 筆快取 */
    private readonly limitMessage = 10;
    /** 對話記錄 */
    private messages: CacheMessage[] = [];
    /** 服務專員 */
    private executive: UserItem | null = null;
    private watchers: UserItem[] = [];

    constructor(private customer: CustomerItem, private task: Task) {
        super();
    }

    public hasUser(userId: number) {
        return this.allUsers.some((u) => u.user.id === userId);
    }

    /**
     * 分配至專員房間, 開始服務
     * @param executive 專員資訊
     */
    public async start(executive: UserItem) {
        const startAt = moment();
        this.task.startAt = startAt.format('YYYY-MM-DD HH:mm:ss');
        this.task = await this.task.save();
        this.customer.socket.emit('center/start');
        this.executive = executive;
    }

    public async sendMessage(data: MySocket.ListenerData.Message.Request, userId?: number) {
        const time = moment();

        if (userId && !this.hasUser(userId)) {
            throw new NotInTaskError();
        }

        const message = new Message();
        message.taskId = this.id;
        message.createdAt = time.format('YYYY-MM-DD HH:mm:ss');
        message.userId = userId || 0;

        switch (data.type) {
            case 'image/jpeg':
                message.content = await this.uploadImage(data.content, 'jpg');
                message.type = MessageType.Image;
                break;
            case 'image/png':
                message.content = await this.uploadImage(data.content, 'png');
                message.type = MessageType.Image;
                break;
            default:
                message.content = data.content;
                message.type = MessageType.Text;
                break;
        }

        const cacheMessage: CacheMessage = {
            id: message.id,
            taskId: this.id,
            type: message.type,
            content: message.getContent(),
            time: message.createdAt,
        };

        this.messages = [cacheMessage, ...this.messages].slice(0, 10);

        this.customer.socket.emit('center/send', cacheMessage);

        this.allUsers.forEach((u) => {
            u.socket.emit('center/send', cacheMessage);
        });

        return cacheMessage;
    }

    public joinWatcher(uitem: UserItem) {
        this.watchers.push(uitem);
        const data: MySocket.EmitterData.CenterJoin = {
            taskId: this.id,
            user: {
                id: uitem.user.id,
                name: uitem.user.name,
            },
        };
        this.customer.socket.emit('center/join', data);
        this.allUsers.forEach((u) => {
            u.socket.emit('center/join', data);
        });
    }

    public leaveWatcher(userId: number) {
        const data: MySocket.EmitterData.CenterLeave = {
            taskId: this.id,
            userId,
        };
        this.customer.socket.emit('center/leave', data);
        this.allUsers.forEach((u) => {
            u.socket.emit('center/leave', data);
        });
    }

    public close() {
        this.allUsers.forEach(({ socket }) => {
            socket.emit('center/close', { taskId: this.id });
        });
        this.emit('close', this);
    }

    public async uploadImage(data: string, ext: 'jpg' | 'png') {
        return new Promise<string>((resolve, reject) => {
            const filename = `${md5(data)}.${ext}`;
            const filepath = path.join(process.env.IMAGE_UPLOAD_PATH, filename);
            fs.writeFile(filepath, data, 'base64', (err) => {
                return err ? reject(err) : resolve(filename);
            });
        });
    }

    public toJson(detail = false) {
        let data: IUser.Socket.EmitterData.Center.Task | IUser.Socket.EmitterData.Center.TaskDetail = {
            id: this.id,
            customer: {
                id: this.customerId,
                name: this.customerName,
            },
            createdAt: this.task.createdAt,
        };

        if (detail) {
            const { executive, watchers } = this;
            data = {
                ...data,
                watchers: watchers.map((w) => ({ id: w.user.id, name: w.user.name })),
                executive: executive ? { id: executive.user.id, name: executive.user.name } : { id: 0, name: '' },
                startAt: this.task.startAt,
                message: this.messages,
            };
        }
        return data;
    }
}
