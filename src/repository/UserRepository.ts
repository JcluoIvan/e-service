import { EntityRepository } from 'typeorm';
import { User } from '../entity/User';
import BaseRepository from './BaseRepository';

@EntityRepository(User)
export class UserRepository extends BaseRepository<User> {
    public findUser(userId: number, companyId: number) {
        return this.createQueryBuilder()
            .where('id = :userId AND company_id = :companyId', { userId, companyId })
            .getOne();
    }

}
