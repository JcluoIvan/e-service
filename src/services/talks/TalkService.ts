import UserService from '../UserService';
import CustomerService from '../CustomerService';
import logger from '../../config/logger';
import CustomerRoom from './CustomerRoom';
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
import { FromType } from '../../entity/Message';
import { Talk, TalkStatus } from '../../entity/Talk';
import { UserNotFoundError } from '../../exceptions/login.errors';

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
    private mapTalks = new Map<number, CustomerRoom>();

    private mapRooms = new Map<number, RoomService>();

    private setting: { mode: Mode; max: number } = {
        mode: Mode.Loop,
        max: 1,
    };

    private loopQueues: RoomService[] = [];

    private autoSendConnecteds: Article[] = [];

    private autoSendStarts: Article[] = [];

    private autoSendPauses: Article[] = [];

    private pause = false;

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
        eventArticle.on('delete.after', async (article) => {
            if (article.companyId !== userService.company.id) {
                return;
            }
            this.updateAutoSend();
        });

        this.updateAutoSend();

        this.updateTalkShutdown();
    }

    private async updateAutoSend() {
        const rows = await getConnection()
            .createQueryBuilder(Article, 'article')
            .select('article.content')
            .addSelect('article.autoSend')
            .addSelect('article.userId')
            .where('auto_send IN (:...autoSend) and company_id = :companyId', {
                autoSend: [AutoSend.Connected, AutoSend.Start, AutoSend.Pause],
                companyId: this.userService.company.id,
            })
            .getMany();
        this.autoSendConnecteds = [];
        this.autoSendStarts = [];
        this.autoSendPauses = [];
        rows.forEach((r) => {
            switch (r.autoSend) {
                case AutoSend.Connected:
                    this.autoSendConnecteds.push(r);
                    break;
                case AutoSend.Start:
                    this.autoSendStarts.push(r);
                    break;
                case AutoSend.Pause:
                    this.autoSendPauses.push(r);
                    break;
            }
        });
    }

    private async updateTalkShutdown() {
        return await getConnection()
            .createQueryBuilder(Talk, 'talk')
            .update()
            .set({
                status: TalkStatus.Shutdown,
            })
            .where(`status != :status`, { status: TalkStatus.Closed })
            .execute();
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
            try {
                const { id, content, time } = await talk.sendMessage(data, { type: FromType.Customer });
                res(responseSuccess({ id, content, time }));
            } catch (err) {
                res(throwError(err));
            }
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
                const { id, content, time } = await talk.sendMessage(data, {
                    type: FromType.Service,
                    userId: utoken.user.id,
                });
                res(responseSuccess({ id, content, time }));
            } catch (err) {
                res(throwError(err));
            }
        });

        utoken.socket.on('talks/pause:toggle', (res) => {
            this.pause = res === true;
            this.userService.nsp.emit('talks/pause:toggle', this.pause);
        });

        utoken.socket.on('talks/room-ready', (res) => sroom.ready());
        utoken.socket.on('talks/room-unready', (res) => sroom.unready());
        utoken.socket.on('talks/talk-start', async ({ talkId }) => {
            try {
                const talk = talkId ? this.getTalk(talkId) : this.talkQueues[0];
                if (talk) {
                    await talk.start(utoken);

                    /** 對話開始後系統發送 start 類型文章  */
                    const from = {
                        type: FromType.Service,
                        userId: utoken.user.id,
                    };
                    this.autoSendStarts
                        .filter((o) => o.userId === utoken.user.id)
                        .forEach(async (article) => {
                            await talk.sendMessage({ content: article.content, type: 'text/plain' }, from);
                        });
                }
            } catch (err) {
                utoken.socket.emit('message/error', err.message);
            }
        });
        /** 轉接 */
        utoken.socket.on('talks/transfer', ({ userId, talkId }) => {
            try {
                const tUser = this.userService.findById(userId);
                const talk = this.getTalk(talkId);
                if (!tUser) {
                    throw new UserNotFoundError();
                }

                talk.transferTo(tUser);
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
            this.talks.forEach((talk) => {
                if (talk.executive && talk.executive.user.id === utoken.user.id) {
                    talk.updateExecutive();
                }
                talk.leaveWatcher(utoken);
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
        const find = this.talks.find((t) => t.ctoken.customer.id === ctoken.customer.id);
        if (find) {
            find.onReconnected(ctoken);
            return find;
        }

        const talk = await CustomerRoom.createTalk(ctoken, this.userService.nsp);
        talk.on('close', () => {
            this.mapTalks.delete(talk.id);
        });
        this.mapTalks.set(talk.id, talk);

        /* 系統暫停中, 發送 pause 類型文章 */
        if (this.pause) {
            this.autoSendPauses.forEach((ar) => {
                talk.sendMessage({ content: ar.content, type: 'text/plain' }, { type: FromType.System });
            });
        } else {
            /* 訪客連線後系統發送 connected 類型文章 */
            this.autoSendConnecteds.forEach((article) => {
                talk.sendMessage({ content: article.content, type: 'text/plain' }, { type: FromType.System });
            });
        }

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

    private updateTalk(talk: CustomerRoom) {
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
