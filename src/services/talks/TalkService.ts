import UserService from '../UserService';
import CustomerService from '../CustomerService';
import logger from '../../config/logger';
import TalkService from './CustomerRoom';
import RoomService from './UserRoom';
import { UserRole, User } from '../../entity/User';
import { throwError, responseSuccess } from '../../support';
import { TalkNotFoundError, NotInTalkError } from '../../exceptions/center.error';
import CustomerToken from '../tokens/CustomerToken';
import UserToken from '../tokens/UserToken';
import BaseService from '../BaseService';
import { eventArticle } from '../../events/event-article';
import { getConnection } from 'typeorm';
import { Article, AutoSend } from '../../entity/Article';

enum Mode {
    /* 平均 */
    Balance = 'balance',
    /* 依序輪流 */
    Loop = 'loop',
}

/**
 * 服務中心
 */
export default class CenterService extends BaseService {
    private mapTalks = new Map<number, TalkService>();

    private mapRooms = new Map<number, RoomService>();

    private setting: { mode: Mode; max: number } = {
        mode: Mode.Loop,
        max: 1,
    };

    private loopQueues: RoomService[] = [];

    private autoSendConnecteds: string[] = [];
    private autoSendStarts: string[] = [];

    get rooms() {
        return Array.from(this.mapRooms.values());
    }

    get talks() {
        return Array.from(this.mapTalks.values());
    }

    /* 待處理佇列 */
    get talkQueues() {
        return this.talks.filter((t) => !t.executive);
    }

    constructor(private userService: UserService, private customerService: CustomerService) {
        super();

        /* customer connect */
        customerService.on('connect', async ({ ctoken: citem }) => this.onCustomerConnected(citem));

        /* 成員登入 */
        userService.on('connect', ({ utoken }) => this.onUserConnected(utoken));

        eventArticle.on('save.after', async (article) => {
            if (article.companyId !== userService.company.id) {
                return;
            }
            this.updateAutoSend();
        });
        this.updateAutoSend();
    }
    private async updateAutoSend() {
        const rows = await getConnection()
            .createQueryBuilder(Article, 'article')
            .select('article.content')
            .addSelect('article.auto_send')
            .where('auto_send IN (:...autoSend) and company_id = :companyId', {
                autoSend: ['connected', 'start'],
                companyId: this.userService.company.id,
            })
            .getMany();
        this.autoSendConnecteds = rows.filter((r) => r.autoSend === AutoSend.Connected).map((r) => r.content);
        this.autoSendStarts = rows.filter((r) => r.autoSend === AutoSend.Start).map((r) => r.content);
    }

    private getTalk(talkId: number) {
        const talk = this.mapTalks.get(talkId);
        if (!talk) {
            throw new TalkNotFoundError();
        }
        return talk;
    }

    /**
     * 顧客連線
     * ＊ 這裡只處理 socket 的事件綁定 ＊
     * @param ctoken CustomerToken
     * @param citem 顧客資料
     */
    private async onCustomerConnected(ctoken: CustomerToken) {
        /* 建立 talk */
        const talk = await this.findOrCreateTalk(ctoken);

        /* 顧客主動中斷 (已完成) */
        ctoken.socket.on('talks/close', () => {
            talk.close();
            ctoken.destroy();
        });

        /** 發送訊息 */
        ctoken.socket.on('talks/send', async (data, res) => {
            const { id, content, time } = await talk.sendMessage(data);
            res(responseSuccess({ id, content, time }));
        });

        ctoken.socket.on('disconnect', () => {
            talk.onDisconnected();
        });

        this.updateTalk(talk);
        this.dispatchTalk();
    }

    /**
     * 成員連線
     * @param socket socket
     * @param utoken 成員資訊
     */
    private async onUserConnected(utoken: UserToken) {
        /* 建立房間 */
        const sroom = await this.findOrGenerateRoom(utoken);
        this.updateTalks(utoken.socket);
        this.updateRooms(utoken.socket);
        this.updateWatchers(utoken, true);

        this.talks
            .filter((t) => t.executive && t.executive.user.id === utoken.user.id)
            .forEach((talk) => {
                utoken.socket.emit('talks/talk-detail', talk.toJsonDetail(utoken));
                talk.updateExecutive();
            });

        utoken.socket.on('talks/send', async (data, res) => {
            try {
                const talk = this.getTalk(data.talkId);
                const { id, content, time } = await talk.sendMessage(data, utoken.user.id);
                res(responseSuccess({ id, content, time }));
            } catch (err) {
                res(throwError(err));
            }
        });

        utoken.socket.on('talks/room-ready', (res) => sroom.ready());
        utoken.socket.on('talks/room-unready', (res) => sroom.unready());
        utoken.socket.on('talks/talk-start', ({ talkId }) => {
            try {
                const talk = talkId ? this.getTalk(talkId) : this.talkQueues[0];
                if (talk) {
                    talk.start(utoken);
                }
            } catch (err) {
                utoken.socket.emit('message/error', err.message);
            }
        });

        utoken.socket.on('talks/talk-close', (data) => {
            const talk = this.mapTalks.get(data.talkId);
            if (talk && talk.executive && talk.executive.user.id === utoken.user.id) {
                talk.close();
            }
        });

        utoken.socket.on('disconnect', () => {
            logger.error(utoken.isOnline);
            this.talks
                .filter((t) => t.executive && t.executive.user.id === utoken.user.id)
                .forEach((talk) => {
                    talk.updateExecutive();
                });
        });

        utoken.socket.on('talks/talk-join', ({ talkId }) => {
            try {
                const talk = this.getTalk(talkId);
                if (utoken.user.isSupervisor || talk.isClosed) {
                    talk.joinWatcher(utoken);
                    utoken.socket.emit('talks/talk-detail', talk.toJsonDetail(utoken));
                    this.updateWatchers(utoken);
                }
            } catch (err) {
                utoken.socket.emit('message/error', { message: err.message });
            }
        });

        utoken.socket.on('talks/talk-leave', ({ talkId }) => {
            try {
                const talk = this.getTalk(talkId);
                talk.leaveWatcher(utoken);
                this.updateWatchers(utoken);
            } catch (err) {
                utoken.socket.emit('message/error', { message: err.message });
            }
        });
    }
    private async findOrCreateTalk(ctoken: CustomerToken) {
        const find = this.talks.find((t) => t.customer.token === ctoken.token);
        if (find) {
            find.onReconnected();
            return find;
        }

        const talk = await TalkService.createTalk(ctoken, this.userService.nsp);
        // talk.sendMessage()
        talk.on('close', () => {
            this.mapTalks.delete(talk.id);
        });
        this.mapTalks.set(talk.id, talk);
        return talk;
    }

    /* 任務分配 */
    private dispatchTalk() {
        // const setting = this.setting;
        // let room: ServiceRoom | null = null;
        // logger.error(this.taskQueues.length, this.loopQueues.length);
        // const readyRooms = this.rooms.filter(r => r.isReady && )
        // if (setting.mode === Mode.Balance) {
        //     room = this.loopQueues.find((r) => r.tasks.length < setting.max) || null;
        // } else if (setting.mode === Mode.Loop) {
        //     const idx = this.loopQueues.findIndex((r) => r.tasks.length < setting.max);
        //     if (idx >= 0) {
        //         room = this.loopQueues[idx];
        //         const pass = this.loopQueues.splice(0, idx + 1);
        //         this.loopQueues = [...this.loopQueues, ...pass];
        //     }
        // }
        // if (!room) {
        //     return;
        // }
        // const task = this.taskQueues.shift();
        // if (task) {
        //     room.addTask(task);
        // }
    }

    private updateTalks(socket: IUser.Socket | IUser.Socket.Namespace) {
        socket.emit('talks/talks', this.talks.map((t) => t.toJson()));
    }

    private updateTalk(talk: TalkService) {
        this.userService.nsp.emit('talks/talk', talk.toJson());
    }

    private updateRooms(io: IUser.Socket | IUser.Socket.Namespace) {
        io.emit('talks/rooms', this.rooms.map((r) => r.toJson()));
    }

    private updateWatchers(utoken: UserToken, detail = false) {
        const talks = this.talks.filter((talk) => {
            return talk.watchers.some((w) => w.user.id === utoken.user.id);
        });
        if (detail) {
            talks.forEach((talk) => {
                utoken.socket.emit('talks/talk-detail', talk.toJsonDetail(utoken));
            });
        }
        utoken.socket.emit('talks/talk-watchers', talks.map((t) => t.id));
    }

    private async findOrGenerateRoom(utoken: UserToken) {
        const find = this.mapRooms.get(utoken.user.id);

        if (find) {
            return find;
        }

        const room = new RoomService(utoken);
        this.mapRooms.set(utoken.user.id, room);
        return room;
    }
}