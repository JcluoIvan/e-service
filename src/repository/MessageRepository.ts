import { EntityRepository } from 'typeorm';
import BaseRepository from './BaseRepository';
import { Message } from '../entity/Message';

@EntityRepository(Message)
export class MessageRepository extends BaseRepository<Message> {
    public findMessage(mid: number, companyId: number) {
        return this.createQueryBuilder()
            .where('id = :mid AND company_id = :companyId', { mid, companyId })
            .getOne();
    }
}
