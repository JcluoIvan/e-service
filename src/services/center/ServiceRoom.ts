import { UserItem } from '../UserService';
import Task from './Task';

export default class ServiceRoom {
    public tasks: Task[] = [];
    private open = false;

    constructor(private uitem: UserItem) {}

    get user() {
        return this.uitem.user;
    }

    public addTask (task: Task) {
        this.tasks.push(task);
    }
}

4
1
1234
