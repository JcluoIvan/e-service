import UserService, { UserItem } from './UserService';
import { User, UserRole } from '../entity/User';
import logger from '../logger';

export default class ExecutiveService {
    constructor(private userService: UserService) {
        userService.on('login', ({ socket, id }) => {
            const item = userService.getUser(id);
            if (!item || item.user.role !== UserRole.Executive) {
                return;
            }

            logger.info('executive login');
        });
    }

}
