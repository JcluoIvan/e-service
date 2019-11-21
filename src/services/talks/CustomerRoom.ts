import { EventEmitter } from 'events';
import { Talk, TalkStatus } from '../../entity/Talk';
import * as moment from 'moment';
import * as md5 from 'md5';
import { Message, MessageType, FromType } from '../../entity/Message';
import { NotInTalkError } from '../../exceptions/center.error';
import * as fs from 'fs';
import * as path from 'path';
import CustomerToken from '../tokens/CustomerToken';
import UserToken from '../tokens/UserToken';
import * as jimp from 'jimp';
import logger from '../../config/logger';
import { fileExists } from '../../support/file';
import { setTimeout, clearTimeout } from 'timers';
import { getConnection } from 'typeorm';
import { Sticker } from '../../entity/Sticker';
import { FailedError } from '../../exceptions/failed.error';
import browserInfo from '../../support/browserInfo';

interface ListenerEvents<T> {
    (event: string | symbol, listener: (...args: any[]) => void): T;
    (event: 'close', listener: void): T;
}
type CacheMessage = IES.Talks.Message;
const CLOSE_DELAY = 10 * 1000;

interface SendMessageData {
    content: string;
    type: 'text/plain' | 'image/jpeg' | 'image/png' | 'sticker';
}

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

const findSticker = async (sid: number) => {
    const sticker = await getConnection()
        .createQueryBuilder(Sticker, 'sticker')
        .where('id = :sid', { sid })
        .getOne();
    if (!sticker) {
        throw new FailedError('sticket not found');
    }
    return sticker;
};

/**
 * 服務任務
 */
export default class CustomerRoom extends EventEmitter {
    get id() {
        return this.talk.id;
    }

    get ctoken() {
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

    get messages() {
        return this.data.messages;
    }

    get isStart() {
        return this.talk.startAt !== null && this.talk.closedAt === null;
    }

    get isClosed() {
        return this.talk.closedAt !== null;
    }

    get isOnline() {
        return this.ctoken.isOnline;
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
        const info = browserInfo(ctoken.socket.handshake.headers);
        const userAgent = ctoken.socket.handshake.headers.userAgent || '';

        talkEntity.executiveId = 0;
        talkEntity.companyId = ctoken.customer.companyId;
        talkEntity.customerId = ctoken.customer.id;
        talkEntity.ip = ctoken.ip;
        talkEntity.userAgent = userAgent;
        talkEntity.device = info.device;
        talkEntity.browser = `${info.browser} (${info.version})`;
        talkEntity.os = `${info.os}(${info.osVersion})`;
        talkEntity.status = TalkStatus.Waiting;
        talkEntity.createdAt = createdAt.format('YYYY-MM-DD HH:mm:ss');

        const talk = await talkEntity.save();

        return new CustomerRoom(ctoken, talk, nsp);
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
        this.talk.status = TalkStatus.Start;
        this.talk.timeWaiting = this.talk.intStartAt - this.talk.intCreatedAt;

        this.talk = await this.talk.save();
        this.data.executive = executive;
        this.ctoken.socket.emit('talks/start', {
            executive: info,
            messages: this.data.messages,
            startAt: moment().valueOf(),
        });
        executive.socket.nsp.emit('talks/talk-start', {
            talkId: this.id,
            startAt: moment().valueOf(),
            status: this.talk.status,
            executive: info,
        });
    }

    public async transferTo(executive: UserToken) {
        if (this.isClosed) {
            return;
        }

        if (!this.isStart) {
            this.start(executive);
            return;
        }

        const info = toUserInfo(executive);
        this.talk.executiveId = executive.user.id;

        this.talk = await this.talk.save();

        this.data.executive = executive;
        this.ctoken.socket.emit('talks/start', {
            executive: info,
            messages: this.data.messages,
            startAt: moment().valueOf(),
        });
        executive.socket.nsp.emit('talks/talk-start', {
            talkId: this.id,
            startAt: moment().valueOf(),
            status: this.talk.status,
            executive: info,
        });
    }

    public async sendMessage(data: SendMessageData, from: { type: FromType; utoken?: UserToken }) {
        const time = moment();
        const isFromUser = from.type === FromType.Service;
        const utoken = from.utoken;

        // const user = isFromUser ? this.allUsers.find((u) => u.user.id === from.userId) : null;
        // if (isFromUser && !user) {
        //     throw new NotInTalkError();
        // }
        // if (!utoken) {
        //     throw new NotInTalkError();
        // }

        const messageEntity = new Message();
        messageEntity.talkId = this.id;
        messageEntity.fromType = from.type;
        messageEntity.createdAt = time.format('YYYY-MM-DD HH:mm:ss');
        messageEntity.userId = (utoken && utoken.user.id) || 0;

        switch (data.type) {
            case 'image/jpeg':
                messageEntity.content = await this.uploadImage(data.content, 'jpg');
                messageEntity.type = MessageType.Image;
                break;
            case 'image/png':
                messageEntity.content = await this.uploadImage(data.content, 'png');
                messageEntity.type = MessageType.Image;
                break;
            case 'sticker':
                const sticker = await findSticker(Number(data.content));
                messageEntity.content = sticker.image;
                messageEntity.type = MessageType.Sticker;
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
            fromType: from.type,
            time: time.valueOf(),
            type: message.type,
            user: {
                id: utoken ? utoken.user.id : 0,
                name: utoken ? utoken.user.name : '',
                imageUrl: utoken ? utoken.user.imageUrl : '',
            },
        };

        this.data.messages = [cacheMessage, ...this.data.messages].slice(0, this.limitMessage);

        this.ctoken.socket.emit('talks/message', cacheMessage);
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
            if (!exists) {
                const base64Data = data.replace(/^data:image\/(png|jpeg);base64,/, '');
                await new Promise((imgPromise) => {
                    fs.writeFile(filepath, base64Data, 'base64', async (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }
                        imgPromise();
                    });
                });
            }

            /* 縮圖 */
            const minpath = path.join(process.env.MESSAGE__IMAGE_UPLOAD_PATH, `${fname}.min.${ext}`);
            const minExists = await fileExists(minpath);
            if (!minExists) {
                const image = await jimp.read(filepath);
                const size = Math.min(image.getWidth(), image.getHeight()) < 240 ? 80 : 240;
                image.scaleToFit(size, size).write(minpath, (e) => {
                    if (e) {
                        logger.error(e);
                    }
                });
            }

            resolve(filename);
        });
    }

    public toJson(): IES.Talks.Talk {
        return {
            id: this.id,
            name: this.ctoken.customer.name,
            ip: this.ctoken.ip,
            online: this.ctoken.isOnline,
            status: this.talk.status,
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
            name: this.ctoken.customer.name,
            ip: this.ctoken.ip,
            online: this.ctoken.isOnline,
            executive: toUserInfo(this.executive),
            status: this.talk.status,
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
            name: this.ctoken.customer.name,
            online: this.ctoken.isOnline,
            executive: toUserInfo(this.executive),
            startAt: this.talk.intStartAt,
            createdAt: this.talk.intCreatedAt,
            messages: this.data.messages,
        };
    }

    public onReconnected(ctoken: CustomerToken) {
        this.data.customer = ctoken;
        this.data.disconnectedAt = 0;
        this.clearDestroyTimer();
        this.ctoken.socket.emit('talks/talk', this.toJsonForCustomer());
        this.nsp.emit('talks/talk-online', { talkId: this.id });
    }

    /**
     * Guest 斷線
     * @param connectLimit 連線小於 n 秒時，自動結案
     */
    public onDisconnected(connectLimit: number = 0) {
        const disconnectedAt = moment().valueOf();
        this.data.disconnectedAt = disconnectedAt;
        this.nsp.emit('talks/talk-offline', { talkId: this.id, disconnectedAt });
        this.clearDestroyTimer();

        const connectTime = disconnectedAt - moment(this.talk.createdAt).valueOf();

        /** 開啟客服後斷線時間小於 n 秒時，自動結案 */
        if (connectLimit > 0 && connectTime < connectLimit * 1000) {
            const connectSeconds = Math.floor(connectTime / 100) / 10;
            this.close(`訪客連線時間 ${connectSeconds}秒, 系統自動結案`, true);
        }

        // this.data.destroyTimer = setTimeout(() => this.close(), CLOSE_DELAY);
    }

    /**
     *
     * @param remark 備註
     */
    /**
     *
     * @param remark 備註
     * @param force 強制結案, 並且不會設為「未服務」狀態 (供系統自動結案用)
     */
    public async close(remark = '', force = false) {
        const closedAt = moment();
        this.ctoken.socket.disconnect();
        this.emit('close');
        this.talk.remark = remark;
        this.talk.closedAt = closedAt.format('YYYY-MM-DD HH:mm:ss');

        if (this.talk.startAt || force) {
            this.talk.status = TalkStatus.Closed;
            this.talk.timeService = this.talk.intClosedAt - this.talk.intStartAt;
            this.talk.remark = remark;
            this.talk = await this.talk.save();
            this.data.executive = null;
            this.nsp.emit('talks/talk-closed', { talkId: this.id, closedAt: closedAt.valueOf() });
        } else {
            const talkId = this.id;
            this.talk.status = TalkStatus.Unprocessed;
            this.talk.timeWaiting = this.talk.timeWaiting = this.talk.intClosedAt - this.talk.intCreatedAt;
            this.talk.remark = remark;
            this.talk = await this.talk.save();
            this.nsp.emit('talks/talk-unprocessed', { talkId, closedAt: closedAt.valueOf() });
        }
    }

    public updateExecutive() {
        this.nsp.emit('talks/talk-executive', { talkId: this.id, executive: toUserInfo(this.executive) });
    }

    private clearDestroyTimer() {
        if (this.data.destroyTimer) {
            clearTimeout(this.data.destroyTimer);
            this.data.destroyTimer = null;
        }
    }
}
