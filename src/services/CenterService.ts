import UserService from './UserService';
import CustomerService from './CustomerService';
import logger from '../logger';
import ServiceTask from './center/ServiceTask';
import ServiceRoom from './center/ServiceRoom';
import { UserRole } from '../entity/User';
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
    /* 待處理佇列 (客服人員皆忙錄中時) */
    private taskQueues: ServiceTask[] = [];
    private taskAssign: ServiceTask[] = [];

    private mapTasks = new Map<number, ServiceTask>();

    private mapRooms = new Map<number, ServiceRoom>();

    private watchers = new Map<number, ServiceTask[]>();

    private setting: { mode: Mode; max: number } = {
        mode: Mode.Loop,
        max: 2,
    };

    private loopQueues: ServiceRoom[] = [];

    get rooms() {
        return Array.from(this.mapRooms.values());
    }

    get tasks() {
        return Array.from(this.mapTasks.values());
    }

    constructor(private userService: UserService, private customerService: CustomerService) {
        super();

        /* customer connect */
        customerService.on('connect', async ({ ctoken: citem }) => this.onCustomerConnected(citem));

        /* 成員登入 */
        userService.on('connect', ({ utoken }) => this.onUserConnected(utoken));
    }

    /**
     * 顧客連線
     * @param socket socket
     * @param citem 顧客資料
     */
    private async onCustomerConnected(ctoken: CustomerToken) {
        /* 建立 task */
        const task = await this.createTask(ctoken);

        /* 顧客主動中斷 (已完成) */
        ctoken.socket.on('center/close', () => {
            task.close();
        });

        /** 發送訊息 */
        ctoken.socket.on('center/send', async (data, res) => {
            const { id, time } = await task.sendMessage(data);
            res(responseSuccess({ id, time }));
        });

        ctoken.socket.on('disconnect', () => {
            task.close();
        });

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

        utoken.socket.on('disconnect', () => {
            /** 移除房間 */
            sroom.disconnect();
        });

        utoken.socket.on('center/send', async (data, res) => {
            const task = this.mapTasks.get(data.taskId);
            if (!task) {
                res(throwError(new TaskNotFoundError()));
                return;
            }
            const { id, time } = await task.sendMessage(data, utoken.user.id);
            res(responseSuccess({ id, time }));
        });

        utoken.socket.on('center/room-ready', (res) => sroom.turnOnReady());
        utoken.socket.on('center/room-unready', (res) => sroom.turnOffReady());

        /** 僅主管才能使用的功能 */
        if (utoken.user.role === UserRole.Supervisor) {
            utoken.socket.on('center/join', (taskId, res) => {
                const task = this.mapTasks.get(taskId);
                const warr = this.watchers.get(utoken.user.id) || [];
                if (!task) {
                    res(throwError(new TaskNotFoundError()));
                    return;
                }
                task.joinWatcher(utoken);
                warr.push(task);
                this.watchers.set(utoken.user.id, warr);
                res();
            });

            utoken.socket.on('center/leave', (taskId, res) => {
                const task = this.mapTasks.get(taskId);
                if (!task) {
                    res(throwError(new TaskNotFoundError()));
                    return;
                }
                const warr = (this.watchers.get(utoken.user.id) || []).filter((t) => t.id !== task.id);
                task.leaveWatcher(utoken.user.id);
                this.watchers.set(utoken.user.id, warr);
                res();
            });
        }
    }

    /* 任務分配 */
    private dispatchTask() {
        const setting = this.setting;
        let room: ServiceRoom | null = null;

        if (this.taskQueues.length === 0 || this.loopQueues.length === 0) {
            return;
        }
        if (setting.mode === Mode.Balance) {
            room = this.loopQueues.find((r) => r.tasks.length < setting.max) || null;
        } else if (setting.mode === Mode.Loop) {
            const idx = this.loopQueues.findIndex((r) => r.tasks.length < setting.max);
            if (idx >= 0) {
                room = this.loopQueues[idx];
                const pass = this.loopQueues.splice(0, idx + 1);
                this.loopQueues = [...this.loopQueues, ...pass];
            }
        }
        const task = this.taskQueues.shift();
        logger.info(room, task);
        if (room && task) {
            room.addTask(task);
            logger.info('despatch');
        }
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

    private async createTask(ctoken: CustomerToken) {
        const task = await ServiceTask.createTask(ctoken);
        this.taskQueues.push(task);
        this.mapTasks.set(task.id, task);

        task.on('close', () => {
            this.mapTasks.delete(task.id);
            this.taskQueues = this.taskQueues.filter((t) => t !== task);
            this.dispatchTask();
        });

        this.updateTask(task);

        return task;
    }

    private async findOrGenerateRoom(utoken: UserToken) {
        const find = this.mapRooms.get(utoken.user.id);

        if (find) {
            if (find.isOnly) {
                find.disconnect();
            }
            find.connect(utoken);
            return find;
        }

        const room = new ServiceRoom(utoken);

        room.on('ready', () => {
            this.loopQueues.push(room);
            this.dispatchTask();
            utoken.socket.nsp.emit('center/room-ready', { userId: room.id });
        });

        room.on('unready', () => {
            this.loopQueues = this.loopQueues.filter((lq) => lq !== room);
            utoken.socket.nsp.emit('center/room-unready', { userId: room.id });
        });

        room.on('add-task', (task) => {
            utoken.socket.nsp.emit('center/despatch-task', { taskId: task.id, userId: room.id });
        });

        room.on('connect', () => {
            utoken.socket.emit('center/room', room.toJson());
        });

        room.on('disconnect', () => {
            utoken.socket.nsp.emit('center/room', room.toJson());

            /** 離開所有 watch 的 task */
            const warr = this.watchers.get(utoken.user.id) || [];
            warr.forEach((t) => {
                t.leaveWatcher(utoken.user.id);
            });
            this.watchers.delete(utoken.user.id);
        });

        this.mapRooms.set(utoken.user.id, room);
        return room;
    }
}
