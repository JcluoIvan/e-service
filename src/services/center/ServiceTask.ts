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
import { clearTimeout, setTimeout } from 'timers';
import logger from '../../logger';
import { User } from '../../entity/User';

type CacheMessage = ISK.EmitterData.Message;

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'disconnected', listener: (data: { disconnectedAt: string }) => void): T;
    (event: 'reconnected', listener: () => void): T;
    (event: 'closed', listener: (data: { closedAt: string }) => void): T;
    (event: 'message', listener: (data: { message: CacheMessage }) => void): T;
    // tslint:disable-next-line:unified-signatures
    (event: 'start', listener: () => void): T;
}

interface Data {
    messages: CacheMessage[];
    executive: UserToken | null;
    customer: CustomerToken;
    watchers: UserToken[];
    disconnectedAt: string | null;
}

const toUserInfo = (user: User | null): IES.UserInfo => {
    return user
        ? {
              id: user.id,
              name: user.name,
              imageUrl: user.imageUrl,
          }
        : {
              id: 0,
              name: '',
              imageUrl: '',
          };
};

/**
 * 服務任務
 */
export default class ServiceTask extends EventEmitter {
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

    public on!: ListenerEvents<this>;

    /** 只保留 message 的 n 筆快取 */
    private readonly limitMessage = 10;

    private data: Data;

    get id() {
        return this.task.id;
    }

    get name() {
        return this.task.customerName;
    }

    get customer() {
        return this.data.customer;
    }

    get createdAt() {
        return this.task.createdAt;
    }

    get allUsers() {
        const { executive, watchers } = this.data;
        return executive ? [executive, ...watchers] : [...watchers];
    }

    get executive() {
        return this.data.executive;
    }

    get isStart() {
        return this.task.startAt !== null && this.task.closedAt === null;
    }

    get isClosed() {
        return this.task.closedAt !== null;
    }

    get isOnline() {
        return this.customer.isOnline;
    }

    constructor(customer: CustomerToken, private task: Task) {
        super();
        this.data = {
            /** 對話記錄 */
            messages: [],
            /** 服務專員 */
            customer,
            executive: null,
            watchers: [],
            disconnectedAt: null,
        };
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
        this.task.closedAt = null;

        this.task = await this.task.save();
        this.emit('start');
        this.data.executive = executive;
    }

    public async sendMessage(data: ISK.ListenerData.Message.Request, userId?: number) {
        const time = moment();

        const user = userId ? this.allUsers.find((u) => u.user.id === userId) : null;

        if (userId && !user) {
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
            content: message.getContent(),
            taskId: message.taskId,
            time: message.createdAt,
            type: message.type,
            user: {
                id: user ? user.user.id : 0,
                name: user ? user.user.name : '',
                imageUrl: user ? user.user.imageUrl : '',
            },
        };

        this.data.messages = [cacheMessage, ...this.data.messages].slice(0, this.limitMessage);
        this.emit('message', { message: cacheMessage });
        return cacheMessage;
    }

    public joinWatcher(utoken: UserToken) {
        this.data.watchers.push(utoken);
        const data: ISK.EmitterData.CenterJoin = {
            taskId: this.id,
            user: {
                id: utoken.user.id,
                name: utoken.user.name,
                imageUrl: utoken.user.imageUrl,
            },
        };
        this.customer.socket.emit('center/join', data);
        this.allUsers.forEach((u) => {
            u.socket.emit('center/join', data);
        });
    }

    public leaveWatcher(userId: number) {
        const data: ISK.EmitterData.CenterLeave = {
            taskId: this.id,
            userId,
        };
        this.customer.socket.emit('center/leave', data);
        this.allUsers.forEach((u) => {
            u.socket.emit('center/leave', data);
        });
    }
    public clearUsers() {
        this.data.executive = null;
        this.data.watchers = [];
    }

    public async uploadImage(data: string, ext: 'jpg' | 'png') {
        return new Promise<string>((resolve, reject) => {
            const filename = `${md5(data)}.${ext}`;
            const filepath = path.join(process.env.MESSAGE__IMAGE_UPLOAD_PATH, filename);
            fs.writeFile(filepath, data, 'base64', (err) => {
                return err ? reject(err) : resolve(filename);
            });
        });
    }

    public toJson(detail = false): IES.TaskCenter.Task {
        const { user = null } = this.executive || {};
        return {
            id: this.id,
            name: this.name,
            executive: toUserInfo(user),
            startAt: this.task.startAt,
            createdAt: this.task.createdAt,
            disconnectedAt: this.data.disconnectedAt,
            closedAt: this.task.closedAt,
        };
    }

    public toJsonDetail(): IES.TaskCenter.TaskDetail {
        const { user = null } = this.executive || {};
        return {
            id: this.id,
            name: this.name,
            executive: toUserInfo(user),
            startAt: this.task.startAt,
            createdAt: this.task.createdAt,
            disconnectedAt: this.data.disconnectedAt,
            closedAt: this.task.closedAt,
            watchers: this.data.watchers.map((w) => toUserInfo(w.user)),
            messages: this.data.messages,
        };
    }

    public onReconnected() {
        this.data.disconnectedAt = null;
        this.emit('reconnected');
    }

    /**
     * 顧客斷線
     */
    public onDisconnected() {
        this.data.disconnectedAt = moment().format('YYYY-MM-DD HH:mm:ss');

        /** 已完成的 task 不再發出 disconnected */
        if (!this.isClosed) {
            logger.error('emit disconnected');
            this.emit('disconnected', { disconnected: this.data.disconnectedAt });
        }
    }

    public async close() {
        this.task.closedAt = moment().format('YYYY-MM-DD HH:mm:ss');
        this.task = await this.task.save();
        this.emit('closed');
    }
}
