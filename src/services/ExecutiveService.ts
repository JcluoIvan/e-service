import UserService, { UserItem } from './UserService';

export default class ExecutiveService {
    constructor(private userService: UserService) {}

    public onConnected({ user, socket }: UserItem) {}
}
