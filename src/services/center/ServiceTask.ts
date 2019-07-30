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
import * as jimp from 'jimp';
import logger from '../../logger';
import { fileExists } from '../../support/file';

type CacheMessage = IES.TaskCenter.Message;

interface Data {
    messages: CacheMessage[];
    executive: UserToken | null;
    customer: CustomerToken;
    watchers: UserToken[];
    disconnectedAt: number;
}

const toUserInfo = (utoken: UserToken | null): IUser.Socket.EmitterData.UserInfo => {
    return utoken
        ? {
              id: utoken.user.id,
              name: utoken.user.name,
              imageUrl: utoken.user.imageUrl,
              online: utoken.isOnline,
          }
        : {
              id: 0,
              name: '',
              imageUrl: '',
              online: false,
          };
};

/**
 * 服務任務
 */
export default class ServiceTask {
    /**
     * 建立任務
     * @param ctoken Guest 連線資訊
     */
    public static async createTask(ctoken: CustomerToken, nsp: IUser.Socket.Namespace) {
        const createdAt = moment();
        const taskEntity = new Task();
        taskEntity.executiveId = 0;
        taskEntity.customerId = ctoken.customer.id;
        taskEntity.customerName = ctoken.customer.name;
        taskEntity.createdAt = createdAt.format('YYYY-MM-DD HH:mm:ss');

        const task = await taskEntity.save();

        return new ServiceTask(ctoken, task, nsp);
    }

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

    get watchers() {
        return this.data.watchers;
    }

    constructor(customer: CustomerToken, private task: Task, private nsp: IUser.Socket.Namespace) {
        this.data = {
            /** 對話記錄 */
            messages: [],
            /** 服務專員 */
            customer,
            executive: null,
            watchers: [],
            disconnectedAt: 0,
        };
        customer.socket.emit('center/waiting');
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
        const info = toUserInfo(executive);
        this.task.startAt = startAt.format('YYYY-MM-DD HH:mm:ss');
        this.task.executiveId = executive.user.id;
        this.task.closedAt = null;

        this.task = await this.task.save();
        this.data.executive = executive;
        this.customer.socket.emit('center/start', {
            executive: info,
            messages: this.data.messages,
            startAt: moment().valueOf(),
        });
        executive.socket.nsp.emit('center/task-start', {
            taskId: this.id,
            executive: info,
        });
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
            time: time.valueOf(),
            type: message.type,
            user: {
                id: user ? user.user.id : 0,
                name: user ? user.user.name : '',
                imageUrl: user ? user.user.imageUrl : '',
            },
        };

        this.data.messages = [cacheMessage, ...this.data.messages].slice(0, this.limitMessage);

        this.customer.socket.emit('center/message', cacheMessage);
        this.allUsers.forEach((u) => {
            u.socket.emit('center/message', cacheMessage);
        });
        return cacheMessage;
    }

    public joinWatcher(utoken: UserToken) {
        this.data.watchers.push(utoken);
        // const data: ISK.EmitterData.CenterJoin = {
        //     taskId: this.id,
        //     user: toUserInfo(utoken),
        // };
        // utoken.socket.emit('center/join', data);
        // this.customer.socket.emit('center/join', data);
        // this.allUsers.forEach((u) => {
        //     u.socket.emit('center/join', data);
        // });
    }

    public leaveWatcher(utoken: UserToken) {
        this.data.watchers = this.data.watchers.filter((w) => w.user.id !== utoken.user.id);
        // const data: ISK.EmitterData.CenterLeave = {
        //     taskId: this.id,
        //     userId: utoken.user.id,
        // };
        // utoken.socket.emit('center/leave', data);

        // this.customer.socket.emit('center/leave', data);
        // this.allUsers.forEach((u) => {
        //     u.socket.emit('center/leave', data);
        // });
    }
    public clearUsers() {
        this.data.executive = null;
        this.data.watchers = [];
    }

    public async uploadImage(data: string, ext: 'jpg' | 'png') {
        return new Promise<string>(async (resolve, reject) => {
            const fname = md5(data);
            const filename = `${fname}.${ext}`;
            const filepath = path.join(process.env.MESSAGE__IMAGE_UPLOAD_PATH, filename);

            const exists = await fileExists(filepath);
            if (exists) {
                resolve(filename);
                return;
            }

            const base64Data = data.replace(/^data:image\/(png|jpeg);base64,/, '');
            fs.writeFile(filepath, base64Data, 'base64', async (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                /* 縮圖 */
                const minpath = path.join(process.env.MESSAGE__IMAGE_UPLOAD_PATH, `${fname}.min.${ext}`);
                const image = await jimp.read(filepath);
                image.scaleToFit(240, 240).write(minpath, (e) => logger.error(e));
                resolve(filename);
            });
        });
    }

    public toJson(): IES.TaskCenter.Task {
        return {
            id: this.id,
            name: this.name,
            online: this.customer.isOnline,
            executive: toUserInfo(this.executive),
            startAt: this.task.intStartAt,
            createdAt: this.task.intCreatedAt,
            disconnectedAt: this.data.disconnectedAt,
            closedAt: this.task.intClosedAt,
        };
    }

    public toJsonDetail(utoken?: UserToken): IES.TaskCenter.TaskDetail {
        const watchers = (utoken && this.data.watchers.filter((w) => w.user.id === utoken.user.id)) || [];
        return {
            id: this.id,
            name: this.name,
            online: this.customer.isOnline,
            executive: toUserInfo(this.executive),
            startAt: this.task.intStartAt,
            createdAt: this.task.intCreatedAt,
            disconnectedAt: this.data.disconnectedAt,
            closedAt: this.task.intClosedAt,
            watchers: watchers.map(toUserInfo),
            messages: this.data.messages,
        };
    }
    public toJsonForCustomer(): IES.TaskCenter.TaskForCustomer {
        return {
            id: this.id,
            name: this.name,
            online: this.customer.isOnline,
            executive: toUserInfo(this.executive),
            startAt: this.task.intStartAt,
            createdAt: this.task.intCreatedAt,
            messages: this.data.messages,
        };
    }

    public onReconnected() {
        this.data.disconnectedAt = 0;

        this.customer.socket.emit('center/task', this.toJsonForCustomer());

        this.nsp.emit('center/task-online', { taskId: this.id });
    }

    /**
     * Guest 斷線
     */
    public onDisconnected() {
        const disconnectedAt = moment().valueOf();
        this.data.disconnectedAt = disconnectedAt;
        this.nsp.emit('center/task-offline', { taskId: this.id, disconnectedAt });
    }

    public async close() {
        if (this.task.startAt) {
            const closedAt = moment();
            this.task.closedAt = closedAt.format('YYYY-MM-DD HH:mm:ss');
            this.task = await this.task.save();
            this.data.executive = null;
            this.nsp.emit('center/task-closed', { taskId: this.id, closedAt: closedAt.valueOf() });
        } else {
            const taskId = this.id;
            /** 移除未開啟服務的 task */
            await this.task.remove();
            this.nsp.emit('center/task-discard', { taskId });
        }
    }

    public updateExecutive() {
        logger.info('update executive');
        this.nsp.emit('center/task-executive', { taskId: this.id, executive: toUserInfo(this.executive) });
    }
}
