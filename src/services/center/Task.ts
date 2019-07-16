import { CustomerItem } from '../CustomerService';
import logger from '../../logger';

let autoincrement = 0;

export default class Task {
    private createdAt = 0;
    private id = 0;

    constructor(private customer: CustomerItem) {
        this.id = ++autoincrement;
        this.createdAt = new Date().getTime();
        logger.info('create task');
    }
}
