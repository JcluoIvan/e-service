import { EntityRepository, Repository } from 'typeorm';
import { User } from '../entity/User';

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    public findByUsername(username: string) {
        return this.createQueryBuilder('user')
            .where('username = :username', { username })
            .leftJoinAndSelect('user.firm', 'firm')
            .getOne();
    }

}
