import { EntityRepository } from 'typeorm';
import BaseRepository from './BaseRepository';
import { Talk } from '../entity/Talk';

@EntityRepository(Talk)
export class TalkRepository extends BaseRepository<Talk> {
    public findUser(talkId: number, companyId: number) {
        return this.createQueryBuilder()
            .where('id = :talkId AND company_id = :companyId', { talkId, companyId })
            .getOne();
    }
}
