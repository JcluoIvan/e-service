import { EventEmitter } from 'events';
import { Talk } from '../../entity/Talk';
import * as moment from 'moment';
import * as md5 from 'md5';
import { Message, MessageType } from '../../entity/Message';
import { NotInTalkError } from '../../exceptions/center.error';
import * as fs from 'fs';
import * as path from 'path';
import CustomerToken from '../tokens/CustomerToken';
import UserToken from '../tokens/UserToken';
import * as jimp from 'jimp';
import logger from '../../config/logger';
import { fileExists } from '../../support/file';
import { setTimeout, clearTimeout } from 'timers';

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'close', listener: void): T;
}

type CacheMessage = IES.Talks.Message;
const CLOSE_DELAY = 10 * 1000;

interface Data {
    messages: CacheMessage[];
    executive: UserToken | null;
    customer: CustomerToken;
    watchers: UserToken[];
    disconnectedAt: number;
    destroyTimer: NodeJS.Timeout | null;
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
export default class TalkService extends EventEmitter {
    get id() {
        return this.talk.id;
    }

    get name() {
        return this.talk.customerName;
    }

    get customer() {
        return this.data.customer;
    }

    get createdAt() {
        return this.talk.createdAt;
    }

    get allUsers() {
        const { executive, watchers } = this.data;
        return executive ? [executive, ...watchers] : [...watchers];
    }

    get executive() {
        return this.data.executive;
    }

    get isStart() {
        return this.talk.startAt !== null && this.talk.closedAt === null;
    }

    get isClosed() {
        return this.talk.closedAt !== null;
    }

    get isOnline() {
        return this.customer.isOnline;
    }

    get watchers() {
        return this.data.watchers;
    }
    /**
     * 建立任務
     * @param ctoken Guest 連線資訊
     */
    public static async createTalk(ctoken: CustomerToken, nsp: IUser.Socket.Namespace) {
        const createdAt = moment();
        const talkEntity = new Talk();
        talkEntity.executiveId = 0;
        talkEntity.customerId = ctoken.customer.id;
        talkEntity.customerName = ctoken.customer.name;
        talkEntity.createdAt = createdAt.format('YYYY-MM-DD HH:mm:ss');

        const talk = await talkEntity.save();

        return new TalkService(ctoken, talk, nsp);
    }

    public on!: ListenerEvents<this>;

    /** 只保留 message 的 n 筆快取 */
    private readonly limitMessage = 10;

    private data: Data;

    constructor(customer: CustomerToken, private talk: Talk, private nsp: IUser.Socket.Namespace) {
        super();
        this.data = {
            /** 對話記錄 */
            messages: [],
            /** 服務專員 */
            customer,
            executive: null,
            watchers: [],
            disconnectedAt: 0,
            destroyTimer: null,
        };
        customer.socket.emit('talks/waiting');
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
        this.talk.startAt = startAt.format('YYYY-MM-DD HH:mm:ss');
        this.talk.executiveId = executive.user.id;
        this.talk.closedAt = null;

        this.talk = await this.talk.save();
        this.data.executive = executive;
        this.customer.socket.emit('talks/start', {
            executive: info,
            messages: this.data.messages,
            startAt: moment().valueOf(),
        });
        executive.socket.nsp.emit('talks/talk-start', {
            talkId: this.id,
            startAt: moment().valueOf(),
            executive: info,
        });
    }

    public async sendMessage(data: ISK.ListenerData.Message.Request, userId?: number) {
        const time = moment();

        const user = userId ? this.allUsers.find((u) => u.user.id === userId) : null;

        if (userId && !user) {
            throw new NotInTalkError();
        }

        const messageEntity = new Message();
        messageEntity.talkId = this.id;
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
            talkId: message.talkId,
            time: time.valueOf(),
            type: message.type,
            user: {
                id: user ? user.user.id : 0,
                name: user ? user.user.name : '',
                imageUrl: user ? user.user.imageUrl : '',
            },
        };

        this.data.messages = [cacheMessage, ...this.data.messages].slice(0, this.limitMessage);

        this.customer.socket.emit('talks/message', cacheMessage);
        this.allUsers.forEach((u) => {
            u.socket.emit('talks/message', cacheMessage);
        });
        return cacheMessage;
    }

    public joinWatcher(utoken: UserToken) {
        this.data.watchers.push(utoken);
        // const data: ISK.EmitterData.CenterJoin = {
        //     talkId: this.id,
        //     user: toUserInfo(utoken),
        // };
        // utoken.socket.emit('talks/join', data);
        // this.customer.socket.emit('talks/join', data);
        // this.allUsers.forEach((u) => {
        //     u.socket.emit('talks/join', data);
        // });
    }

    public leaveWatcher(utoken: UserToken) {
        this.data.watchers = this.data.watchers.filter((w) => w.user.id !== utoken.user.id);
        // const data: ISK.EmitterData.CenterLeave = {
        //     talkId: this.id,
        //     userId: utoken.user.id,
        // };
        // utoken.socket.emit('talks/leave', data);

        // this.customer.socket.emit('talks/leave', data);
        // this.allUsers.forEach((u) => {
        //     u.socket.emit('talks/leave', data);
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

    public toJson(): IES.Talks.Talk {
        return {
            id: this.id,
            name: this.name,
            ip: this.customer.ip,
            online: this.customer.isOnline,
            executive: toUserInfo(this.executive),
            startAt: this.talk.intStartAt,
            createdAt: this.talk.intCreatedAt,
            disconnectedAt: this.data.disconnectedAt,
            closedAt: this.talk.intClosedAt,
        };
    }

    public toJsonDetail(utoken?: UserToken): IES.Talks.TalkDetail {
        const watchers = (utoken && this.data.watchers.filter((w) => w.user.id === utoken.user.id)) || [];
        return {
            id: this.id,
            name: this.name,
            ip: this.customer.ip,
            online: this.customer.isOnline,
            executive: toUserInfo(this.executive),
            startAt: this.talk.intStartAt,
            createdAt: this.talk.intCreatedAt,
            disconnectedAt: this.data.disconnectedAt,
            closedAt: this.talk.intClosedAt,
            watchers: watchers.map(toUserInfo),
            messages: this.data.messages,
        };
    }
    public toJsonForCustomer(): IES.Talks.TalkForCustomer {
        return {
            id: this.id,
            name: this.name,
            online: this.customer.isOnline,
            executive: toUserInfo(this.executive),
            startAt: this.talk.intStartAt,
            createdAt: this.talk.intCreatedAt,
            messages: this.data.messages,
        };
    }

    public onReconnected() {
        this.data.disconnectedAt = 0;
        this.clearDestroyTimer();
        this.customer.socket.emit('talks/talk', this.toJsonForCustomer());
        this.nsp.emit('talks/talk-online', { talkId: this.id });
    }

    /**
     * Guest 斷線
     */
    public onDisconnected() {
        const disconnectedAt = moment().valueOf();
        this.data.disconnectedAt = disconnectedAt;
        this.nsp.emit('talks/talk-offline', { talkId: this.id, disconnectedAt });
        this.clearDestroyTimer();
        this.data.destroyTimer = setTimeout(() => this.close(), CLOSE_DELAY);
    }

    public async close() {
        const clostAt = this.data.disconnectedAt ? moment(this.data.disconnectedAt) : moment();
        if (this.talk.startAt) {
            const closedAt = moment();
            this.talk.closedAt = closedAt.format('YYYY-MM-DD HH:mm:ss');
            this.talk = await this.talk.save();
            this.data.executive = null;
            this.nsp.emit('talks/talk-closed', { talkId: this.id, closedAt: closedAt.valueOf() });
        } else {
            const talkId = this.id;
            /** 移除未開啟服務的 task */

            await this.talk.remove();
            this.nsp.emit('talks/talk-discard', { talkId });
        }
        this.customer.socket.disconnect();
        this.emit('close');
    }

    public updateExecutive() {
        logger.info('update executive');
        this.nsp.emit('talks/talk-executive', { talkId: this.id, executive: toUserInfo(this.executive) });
    }

    private clearDestroyTimer() {
        if (this.data.destroyTimer) {
            clearTimeout(this.data.destroyTimer);
            this.data.destroyTimer = null;
        }
    }
}