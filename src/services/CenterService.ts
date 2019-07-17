import UserService, { UserItem } from './UserService';
import CustomerService, { CustomerItem } from './CustomerService';
import logger from '../logger';
import Task from './center/Task';
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
    private taskQueues: Task[] = [];

    private tasks = new Map<number, Task>();

    private rooms: ServiceRoom[] = [];

    private setting: { mode: Mode; max: number } = {
        mode: Mode.Loop,
        max: 2,
    };

    private loopIndex = 0;

    constructor(private userService: UserService, private customerService: CustomerService) {
        /* customer connect */
        customerService.on('connect', ({ socket, citem }) => {
            if (!citem) {
                logger.error('error. not found customer data');
                return;
            }

            /* 建立 task */
            const task = new Task(citem);

            this.taskQueues.push(task);

            this.tasks.set(task.id, task);

            /* 顧客主動中斷 (已完成) */
            socket.on('center/close', () => {
                task.close();
                this.tasks.delete(task.id);
                this.dispatchTask();
            });

            socket.on('center/send', (data, res) => {
                const time = task.sendMessage(data);
                res(responseSuccess(time));
            });

            this.dispatchTask();
        });

        /* 成員登入 */
        userService.on('login', ({ socket, uitem }) => {
            /* 不存在 or 非行專員則不開啟服務房間 */
            if (uitem.user.role !== UserRole.Supervisor) {
                return;
            }

            socket.on('disconnect', () => {
                this.rooms = this.rooms.filter((r) => r.id !== uitem.user.id);
            });

            socket.on('center/send', (data, res) => {
                const task = this.tasks.get(data.taskId);
                if (!task) {
                    res(throwError(new TaskNotFoundError()));
                    return;
                }
                if (!task.hasUser(uitem.user.id)) {
                    res(throwError(new NotInTaskError()));
                    return;
                }
                const time = task.sendMessage(data);
                res(responseSuccess(time));
            });

            /** 僅主管才能使用的功能 */
            if (uitem.user.role === UserRole.Supervisor) {
                socket.on('center/join', (taskId, res) => {
                    const task = this.tasks.get(taskId);
                    if (!task) {
                        res(throwError(new TaskNotFoundError()));
                        return;
                    }
                    task.joinWatcher(uitem);
                    res();
                });

                socket.on('center/leave', (taskId, res) => {
                    const task = this.tasks.get(taskId);
                    if (!task) {
                        res(throwError(new TaskNotFoundError()));
                        return;
                    }
                    task.leaveWatcher(uitem);
                    res();
                });
            }

            const sroom = new ServiceRoom(uitem);
            this.rooms.push(sroom);

            this.dispatchTask();
        });
    }

    /* 任務分配 */
    private dispatchTask() {
        const setting = this.setting;
        let room: ServiceRoom | null = null;

        if (this.taskQueues.length === 0) {
            return;
        }

        if (setting.mode === Mode.Balance) {
            room = this.rooms.find((r) => r.tasks.length < setting.max) || null;
        } else if (setting.mode === Mode.Loop) {
            const numRooms = this.rooms.length;
            let idx = this.loopIndex++ / this.rooms.length;
            const maxIdx = idx + numRooms;
            while (idx < maxIdx || room) {
                room = this.rooms[idx % numRooms];
                room = room && room.tasks.length < setting.max ? room : null;
                idx += 1;
            }
        }
        const task = this.taskQueues.shift();

        if (room && task) {
            room.addTask(task);
        }
    }
}
