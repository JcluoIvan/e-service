import { EntityRepository, SelectQueryBuilder, getConnection } from 'typeorm';
import { User } from '../entity/User';
import BaseRepository from './BaseRepository';
import logger = require('fancy-log');
import { LogUserLogin } from '../entity/LogUserLogin';
import { UserNotFoundError } from '../exceptions/login.errors';

@EntityRepository(User)
export class UserRepository extends BaseRepository<User> {
    public async findUser(userId: number, companyId: number) {
        return this.createQueryBuilder()
            .where('id = :userId AND company_id = :companyId', { userId, companyId })
            .getOne();
    }

    public async findUserOrError(userId: number, companyId: number) {
        const user = await this.findUser(userId, companyId);
        if (!user) {
            throw new UserNotFoundError();
        }
        return user;

    }


    public async listUsers(
        user: User,
        queryData: { page: number; size: number; sorts?: string[] },
        cb: (query: SelectQueryBuilder<User>) => void,
    ) {
        const paginate = await this.paginate('usr', queryData, (buildQuery) => {
            buildQuery.where('usr.company_id = :cid', { cid: user.companyId })
                .orderBy('usr.role')
                .addOrderBy('usr.id');

            cb(buildQuery);
        });

        if (user.isSupervisor) {
            await getConnection()
                .getCustomRepository(UserRepository)
                .joinHasOne(
                    {
                        orm: LogUserLogin,
                        name: 'log',
                        col: 'id',
                        joinCol: 'userId',
                        rows: paginate.rows,
                        buildQuery: (subQuery) => {
                            const groupByQuery = [
                                `select max(id)`,
                                `from log_user_login`,
                                `where company_id = ${user.companyId}`,
                                `group by user_id`,
                            ].join(' ');
                            subQuery.where(`log.id in (${groupByQuery})`)
                                .select('log.userId')
                                .addSelect('log.ip')
                                .addSelect('log.device')
                                .addSelect('log.browser')
                                .addSelect('log.os')
                                .addSelect('log.createdAt')
                                .addSelect('log.status');
                        },
                    },
                    (model, row) => {
                        row.logLast = model;
                    },
                );
        }
        return paginate;
    }
}
