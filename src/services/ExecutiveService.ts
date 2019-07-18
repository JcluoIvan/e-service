import UserService, { UserItem } from './UserService';
import { User, UserRole } from '../entity/User';
import logger from '../logger';

export default class ExecutiveService {
    constructor(private userService: UserService) {
        userService.on('login', ({ uitem }) => {
            if (uitem.user.role !== UserRole.Executive) {
                return;
            }

            logger.info('executive login');
        });
    }
}
