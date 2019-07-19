import { EventEmitter } from 'events';
import { Task } from '../../entity/Task';
import * as moment from 'moment';
import * as md5 from 'md5';
import { Message, MessageType } from '../../entity/Message';
import { NotInTaskError } from '../../exceptions/center.error';
import * as fs from 'fs';
import * as path from 'path';
import CustomerToken from '../tokens/CustomerToken';
import UserToken from '../tokens/UserToken';

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

    get name() {
        return this.task.customerName;
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
     * @param ctoken 顧客連線資訊
     */
    public static async createTask(ctoken: CustomerToken) {
        const createdAt = moment();
        const taskEntity = new Task();
        taskEntity.executiveId = 0;
        taskEntity.customerId = ctoken.customer.id;
        taskEntity.customerName = ctoken.customer.name;
        taskEntity.createdAt = createdAt.format('YYYY-MM-DD HH:mm:ss');

        const task = await taskEntity.save();

        return new ServiceTask(ctoken, task);
    }
    public emit!: EmitterEvents;
    public on!: ListenerEvents<this>;

    /** 只保留 message 的 n 筆快取 */
    private readonly limitMessage = 10;
    /** 對話記錄 */
    private messages: CacheMessage[] = [];
    /** 服務專員 */
    private executive: UserToken | null = null;
    private watchers: UserToken[] = [];
    private disconnectedAt: string | null = null;

    constructor(private customer: CustomerToken, private task: Task) {
        super();
    }

    public hasUser(userId: number) {
        return this.allUsers.some((u) => u.user.id === userId);
    }

    /**
     * 分配至專員房間, 開始服務
     * @param executive 專員資訊
     */
    public async start(executive: UserToken) {
        const startAt = moment();
        this.task.startAt = startAt.format('YYYY-MM-DD HH:mm:ss');
        this.task.executiveId = executive.user.id;
        this.task = await this.task.save();
        this.customer.socket.emit('center/start');
        this.executive = executive;
    }

    public async sendMessage(data: MySocket.ListenerData.Message.Request, userId?: number) {
        const time = moment();

        if (userId && !this.hasUser(userId)) {
            throw new NotInTaskError();
        }

        const messageEntity = new Message();
        messageEntity.taskId = this.id;
        messageEntity.createdAt = time.format('YYYY-MM-DD HH:mm:ss');
        messageEntity.userId = userId || 0;

        switch (data.type) {
            case 'image/jpeg':
                messageEntity.content = await this.uploadImage(data.content, 'jpg');
                messageEntity.type = MessageType.Image;
                break;
            case 'image/png':
                messageEntity.content = await this.uploadImage(data.content, 'png');
                messageEntity.type = MessageType.Image;
                break;
            default:
                messageEntity.content = data.content;
                messageEntity.type = MessageType.Text;
                break;
        }
        const message = await messageEntity.save();

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

    public joinWatcher(utoken: UserToken) {
        this.watchers.push(utoken);
        const data: MySocket.EmitterData.CenterJoin = {
            taskId: this.id,
            user: {
                id: utoken.user.id,
                name: utoken.user.name,
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

    public onDisconnected() {
        this.disconnectedAt = moment().format('YYYY-MM-DD HH:mm:ss');
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
            name: this.name,
            executeId: this.executive ? this.executive.user.id : 0,
            startAt: this.task.startAt,
            createdAt: this.task.createdAt,
            disconnectedAt: this.disconnectedAt,
        };

        if (detail) {
            const { executive, watchers } = this;
            data = {
                ...data,
                watchers: watchers.map((w) => w.user.id),
                message: this.messages,
            };
        }
        return data;
    }
}
