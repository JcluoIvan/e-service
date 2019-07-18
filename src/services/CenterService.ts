import UserService, { UserItem } from './UserService';
import CustomerService, { CustomerItem } from './CustomerService';
import logger from '../logger';
import ServiceTask from './center/ServiceTask';
import ServiceRoom from './center/ServiceRoom';
import { UserRole } from '../entity/User';
import { throwError, responseSuccess } from '../support';
import { TaskNotFoundError, NotInTaskError } from '../exceptions/center.error';

enum Mode {
    /* 平均 */
    Balance = 'balance',
    /* 依序輪流 */
    Loop = 'loop',
}

/**
 * 服務中心
 */
export default class CenterService {
    /* 待處理佇列 (客服人員皆忙錄中時) */
    private taskQueues: ServiceTask[] = [];

    private tasks = new Map<number, ServiceTask>();

    // private rooms: ServiceRoom[] = [];

    private rooms = new Map<number, ServiceRoom>();

    private watchers = new Map<number, ServiceTask[]>();

    private setting: { mode: Mode; max: number } = {
        mode: Mode.Loop,
        max: 2,
    };

    private loopIndex = 0;

    constructor(private userService: UserService, private customerService: CustomerService) {
        /* customer connect */
        customerService.on('connect', async ({ citem }) => this.onCustomerConnected(citem));

        /* 成員登入 */
        userService.on('login', ({ uitem }) => this.onUserConnected(uitem));
    }

    /**
     * 顧客連線
     * @param socket socket
     * @param citem 顧客資料
     */
    private async onCustomerConnected(citem: CustomerItem) {
        if (!citem) {
            logger.error('error. not found customer data');
            return;
        }

        /* 建立 task */
        const task = await this.createTask(citem);

        /* 顧客主動中斷 (已完成) */
        citem.socket.on('center/close', () => {
            task.close();
        });

        /** 發送訊息 */
        citem.socket.on('center/send', async (data, res) => {
            const { id, time } = await task.sendMessage(data);
            res(responseSuccess({ id, time }));
        });

        citem.socket.on('disconnect', () => {
            task.close();
        });

        this.dispatchTask();
    }

    /**
     * 成員連線
     * @param socket socket
     * @param uitem 成員資訊
     */
    private async onUserConnected(uitem: UserItem) {
        /* 建立房間 */

        const sroom = await this.createRoom(uitem);

        uitem.socket.on('disconnect', () => {
            /** 移除房間 */
            sroom.disconnect();
        });

        uitem.socket.on('center/send', async (data, res) => {
            const task = this.tasks.get(data.taskId);
            if (!task) {
                res(throwError(new TaskNotFoundError()));
                return;
            }
            const { id, time } = await task.sendMessage(data, uitem.user.id);
            res(responseSuccess({ id, time }));
        });

        uitem.socket.on('center/room-ready', (data, res) => {
            sroom.turnOnReady();
        });

        /** 僅主管才能使用的功能 */
        if (uitem.user.role === UserRole.Supervisor) {
            uitem.socket.on('center/join', (taskId, res) => {
                const task = this.tasks.get(taskId);
                const warr = this.watchers.get(uitem.user.id) || [];
                if (!task) {
                    res(throwError(new TaskNotFoundError()));
                    return;
                }
                task.joinWatcher(uitem);
                warr.push(task);
                this.watchers.set(uitem.user.id, warr);
                res();
            });

            uitem.socket.on('center/leave', (taskId, res) => {
                const task = this.tasks.get(taskId);
                if (!task) {
                    res(throwError(new TaskNotFoundError()));
                    return;
                }
                const warr = (this.watchers.get(uitem.user.id) || []).filter((t) => t.id !== task.id);
                task.leaveWatcher(uitem.user.id);
                this.watchers.set(uitem.user.id, warr);
                res();
            });
        }
    }

    /* 任務分配 */
    private dispatchTask() {
        const setting = this.setting;
        let room: ServiceRoom | null = null;

        if (this.taskQueues.length === 0) {
            return;
        }
        const rooms = Array.from(this.rooms.values()).sort((a, b) => a.user.id - b.user.id);

        if (setting.mode === Mode.Balance) {
            room = rooms.find((r) => r.serviceTasks.length < setting.max) || null;
        } else if (setting.mode === Mode.Loop) {
            const numRooms = rooms.length;
            let idx = this.loopIndex++ / rooms.length;
            const maxIdx = idx + numRooms;
            while (idx < maxIdx || room) {
                room = rooms[idx % numRooms];
                room = room && room.serviceTasks.length < setting.max ? room : null;
                idx += 1;
            }
        }
        const task = this.taskQueues.shift();

        if (room && task) {
            room.addTask(task);
        }
    }

    private async createTask(citem: CustomerItem) {
        const task = await ServiceTask.createTask(citem);
        this.taskQueues.push(task);
        this.tasks.set(task.id, task);

        task.on('close', () => {
            this.tasks.delete(task.id);
            this.taskQueues = this.taskQueues.filter((t) => t !== task);
            this.dispatchTask();
        });
        return task;
    }

    private async createRoom(uitem: UserItem) {
        const room = this.rooms.get(uitem.user.id) || new ServiceRoom(uitem.user);

        if (room.isOnly) {
            room.disconnect();
        }

        room.on('ready', () => {
            uitem.socket.nsp.emit('center/room', room.toJson());
        });

        room.on('unready', () => {
            uitem.socket.nsp.emit('center/room', room.toJson());
        });

        room.on('add-task', (task) => {
            uitem.socket.nsp.emit('center/despatch-task', { taskId: task.id, roomId: room.id });
        });

        room.on('connect', () => {
            uitem.socket.emit('center/room', room.toJson());
        });

        room.on('disconnect', () => {
            uitem.socket.nsp.emit('center/room', room.toJson());

            /** 離開所有 watch 的 task */
            const warr = this.watchers.get(uitem.user.id) || [];
            warr.forEach((t) => {
                t.leaveWatcher(uitem.user.id);
            });
            this.watchers.delete(uitem.user.id);
        });

        this.rooms.set(uitem.user.id, room);
        room.connect(uitem);
        return room;
    }
}
