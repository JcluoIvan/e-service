import { UserItem } from '../UserService';
import Task from './Task';

export default class ServiceRoom {
    public tasks: Task[] = [];
    private open = false;

    private templates = {
        hello: '',
    };

    constructor(private uitem: UserItem) {}

    get id() {
        return this.user.id;
    }

    get user() {
        return this.uitem.user;
    }

    get socket() {
        return this.uitem.socket;
    }

    public addTask(task: Task) {
        this.tasks.push(task);
        this.socket.nsp.emit('center/despatch-task', { taskId: task.id, roomId: this.id });
        task.socket.emit('center/join-room');
    }

    public toJson() {
        const { user } = this.uitem;
        return {
            tasks: this.tasks.map((t) => t.id),
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
            },
            open: this.open,
        };
    }
}
