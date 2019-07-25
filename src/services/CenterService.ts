import UserService from './UserService';
import CustomerService from './CustomerService';
import logger from '../logger';
import ServiceTask from './center/ServiceTask';
import ServiceRoom from './center/ServiceRoom';
import { UserRole, User } from '../entity/User';
import { throwError, responseSuccess } from '../support';
import { TaskNotFoundError, NotInTaskError } from '../exceptions/center.error';
import CustomerToken from './tokens/CustomerToken';
import UserToken from './tokens/UserToken';
import BaseService from './BaseService';

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
    private mapTasks = new Map<number, ServiceTask>();

    private mapRooms = new Map<number, ServiceRoom>();

    private mapCustomer = new Set<string>();

    private setting: { mode: Mode; max: number } = {
        mode: Mode.Loop,
        max: 1,
    };

    private loopQueues: ServiceRoom[] = [];

    get rooms() {
        return Array.from(this.mapRooms.values());
    }

    get tasks() {
        return Array.from(this.mapTasks.values());
    }

    /* 待處理佇列 */
    get taskQueues() {
        return this.tasks.filter((t) => !t.executive);
    }

    constructor(private userService: UserService, private customerService: CustomerService) {
        super();

        /* customer connect */
        customerService.on('connect', async ({ ctoken: citem }) => this.onCustomerConnected(citem));

        /* 成員登入 */
        userService.on('connect', ({ utoken }) => this.onUserConnected(utoken));
    }

    private getTask(taskId: number) {
        const task = this.mapTasks.get(taskId);
        if (!task) {
            throw new TaskNotFoundError();
        }
        return task;
    }

    /**
     * 顧客連線
     * ＊ 這裡只處理 socket 的事件綁定 ＊
     * @param ctoken CustomerToken
     * @param citem 顧客資料
     */
    private async onCustomerConnected(ctoken: CustomerToken) {
        /* 建立 task */
        const task = await this.findOrCreateTask(ctoken);

        /* 顧客主動中斷 (已完成) */
        ctoken.socket.on('center/close', () => {
            const executive = task.executive;
            task.close();
            ctoken.destroy();
        });

        /** 發送訊息 */
        ctoken.socket.on('center/send', async (data, res) => {
            const { id, content, time } = await task.sendMessage(data);
            res(responseSuccess({ id, content, time }));
        });

        ctoken.socket.on('disconnect', () => {
            task.onDisconnected();
        });

        if (!this.mapCustomer.has(ctoken.token)) {
            this.mapCustomer.add(ctoken.token);
            ctoken.on('destroy', () => {
                const executive = task.executive;
                task.close();
                this.mapCustomer.delete(ctoken.token);
            });
        }

        this.updateTask(task);
        this.dispatchTask();
    }

    /**
     * 成員連線
     * @param socket socket
     * @param utoken 成員資訊
     */
    private async onUserConnected(utoken: UserToken) {
        /* 建立房間 */
        const sroom = await this.findOrGenerateRoom(utoken);

        this.updateTasks(utoken.socket);
        this.updateRooms(utoken.socket);
        this.updateWatchers(utoken, true);

        this.tasks
            .filter((t) => t.executive && t.executive.user.id === utoken.user.id)
            .forEach((task) => {
                utoken.socket.emit('center/task-detail', task.toJsonDetail(utoken));
                task.updateExecutive();
            });

        utoken.socket.on('center/send', async (data, res) => {
            try {
                const task = this.getTask(data.taskId);
                const { id, content, time } = await task.sendMessage(data, utoken.user.id);
                res(responseSuccess({ id, content, time }));
            } catch (err) {
                res(throwError(err));
            }
        });

        utoken.socket.on('center/room-ready', (res) => sroom.ready());
        utoken.socket.on('center/room-unready', (res) => sroom.unready());
        utoken.socket.on('center/task-start', ({ taskId }) => {
            try {
                const task = taskId ? this.getTask(taskId) : this.taskQueues[0];
                if (task) {
                    task.start(utoken);
                }
            } catch (err) {
                utoken.socket.emit('message/error', err.message);
            }
        });

        utoken.socket.on('disconnect', () => {
            logger.error(utoken.isOnline);
            this.tasks
                .filter((t) => t.executive && t.executive.user.id === utoken.user.id)
                .forEach((task) => {
                    task.updateExecutive();
                });
        });

        utoken.socket.on('center/task-join', ({ taskId }) => {
            try {
                const task = this.getTask(taskId);
                if (utoken.user.isSupervisor || task.isClosed) {
                    task.joinWatcher(utoken);
                    utoken.socket.emit('center/task-detail', task.toJsonDetail(utoken));
                    this.updateWatchers(utoken);
                }
            } catch (err) {
                utoken.socket.emit('message/error', { message: err.message });
            }
        });

        utoken.socket.on('center/task-leave', ({ taskId }) => {
            try {
                const task = this.getTask(taskId);
                task.leaveWatcher(utoken);
                this.updateWatchers(utoken);
            } catch (err) {
                utoken.socket.emit('message/error', { message: err.message });
            }
        });
    }
    private async findOrCreateTask(ctoken: CustomerToken) {
        const find = this.tasks.find((t) => t.customer.token === ctoken.token);
        if (find) {
            find.onReconnected();
            return find;
        }

        const task = await ServiceTask.createTask(ctoken, this.userService.nsp);
        this.mapTasks.set(task.id, task);
        return task;
    }

    /* 任務分配 */
    private dispatchTask() {
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

    private updateTasks(socket: IUser.Socket | IUser.Socket.Namespace) {
        socket.emit('center/tasks', this.tasks.map((t) => t.toJson()));
    }

    private updateTask(task: ServiceTask) {
        this.userService.nsp.emit('center/task', task.toJson());
    }

    private updateRooms(io: IUser.Socket | IUser.Socket.Namespace) {
        io.emit('center/rooms', this.rooms.map((r) => r.toJson()));
    }

    private updateWatchers(utoken: UserToken, detail = false) {
        const tasks = this.tasks.filter((task) => {
            return task.watchers.some((w) => w.user.id === utoken.user.id);
        });
        if (detail) {
            tasks.forEach((task) => {
                utoken.socket.emit('center/task-detail', task.toJsonDetail(utoken));
            });
        }
        utoken.socket.emit('center/task-watchers', tasks.map((t) => t.id));
    }

    private async findOrGenerateRoom(utoken: UserToken) {
        const find = this.mapRooms.get(utoken.user.id);

        if (find) {
            return find;
        }

        const room = new ServiceRoom(utoken);
        this.mapRooms.set(utoken.user.id, room);
        return room;

        // room.on('ready', () => {
        //     this.loopQueues.push(room);
        //     this.dispatchTask();
        //     utoken.socket.nsp.emit('center/room-ready', { userId: room.id });
        // });

        // room.on('unready', () => {
        //     this.loopQueues = this.loopQueues.filter((lq) => lq !== room);
        //     utoken.socket.nsp.emit('center/room-unready', { userId: room.id });
        // });

        // room.on('add-task', ({ task }) => {
        //     logger.error('add-task');
        //     const data: IUser.Socket.EmitterData.Center.DespatchTask = {
        //         taskId: task.id,
        //         executive: {
        //             id: utoken.user.id,
        //             name: utoken.user.name,
        //             imageUrl: utoken.user.imageUrl,
        //         },
        //     };
        //     utoken.socket.nsp.emit('center/despatch-task', data);
        // });

        // room.on('connect', () => {
        //     utoken.socket.emit('center/room', room.toJson());
        // });

        // room.on('disconnect', () => {
        //     utoken.socket.nsp.emit('center/room', room.toJson());

        //     /** 離開所有 watch 的 task */
        //     const warr = this.watchers.get(utoken.user.id) || [];
        //     warr.forEach((t) => {
        //         t.leaveWatcher(utoken.user.id);
        //     });
        //     this.watchers.delete(utoken.user.id);
        // });

        // this.mapRooms.set(utoken.user.id, room);
        // return room;
    }
}
