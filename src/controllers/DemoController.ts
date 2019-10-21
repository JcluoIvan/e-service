import BaseController from './BaseController';
import { getConnection } from 'typeorm';
import { User, UserRole } from '../entity/User';
import { IpsRepository } from '../repository/IpsRepository';
import { setPriority } from 'os';
import browserInfo from '../support/browserInfo';
import { UserRepository } from '../repository/UserRepository';
import { LogUserLoginRepository } from '../repository/LogUserLoginRepository';
import { LogUserLogin } from '../entity/LogUserLogin';
import logger from '../config/logger';

export default class DemoController extends BaseController {
    public async index() {
        const user = await getConnection()
            .getCustomRepository(UserRepository)
            .findOne(10);
        const queryData = {
            page: 1,
            size: 10,
            role: 'all',
        };
        if (user) {
            // const groupByQuery = [
            //     `select max(id)`,
            //     `from log_user_login`,
            //     `where company_id = ${user.companyId}`,
            //     `group by user_id`,
            // ].join(' ');
            // const r = await getConnection()
            //     .createQueryBuilder(LogUserLogin, 'log')
            //     .where(`log.id in (${groupByQuery})`)
            //     .getMany();
            // this.response.send(r);
            // return;
            const paginate = await getConnection()
                .getCustomRepository(UserRepository)
                .paginate('user', queryData, (buildQuery) => {
                    const role = queryData.role;
                    if (role && role !== 'all') {
                        buildQuery.andWhere('role = :role', { role: queryData.role });
                    }
                    buildQuery.andWhere('id in (1, 10)');
                });

            await getConnection()
                .getCustomRepository(UserRepository)
                .joinHasOne(
                    {
                        orm: LogUserLogin,
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
                            subQuery.where(`id in (${groupByQuery})`);
                        },
                    },
                    (model, row) => {
                        logger.warn(model);
                        row.logLast = model;
                    },
                );

            // .listUsers(user, queryData, (buildQuery) => {
            //     const role = queryData.role;
            //     if (role && role !== 'all') {
            //         buildQuery.andWhere('role = :role', { role: queryData.role });
            //     }
            // });
            this.response.send(paginate);
            return;
        }

        /** 來自 */
        const referec = this.request.headers.referer || null;

        const info = browserInfo(this.request.headers);
        if (this.request.query.info) {
            this.response.send(info);
        } else {
            this.response.send(this.request.headers);
        }
    }
}
