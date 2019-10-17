import BaseController from './BaseController';
import { getConnection } from 'typeorm';
import { StatusCode } from '../exceptions';
import logger from '../config/logger';
import { User, UserRole } from '../entity/User';
import { UserNotFoundError } from '../exceptions/login.errors';
import { UserRepository } from '../repository/UserRepository';
import { isValid, isRequired, isMax, isMin, isIn, isWhen, isExists } from '../validations';
import { ForbiddenError } from '../exceptions/auth.error';
import { eventUser } from '../events/event-user';

export default class UserController extends BaseController {
    public async findUser() {
        const id = this.request.params.id;
        const user = await getConnection()
            .getCustomRepository(UserRepository)
            .findUser(id, this.user.companyId);
        if (!user) {
            throw new UserNotFoundError();
        }
        this.response.send(user);
    }

    public async listUser() {
        const queryData = this.request.query || {};
        const paginate = await getConnection()
            .getCustomRepository(UserRepository)
            .paginate('user', queryData, (buildQuery) => {
                buildQuery.where('company_id = :cid', { cid: this.user.companyId }).addOrderBy('id', 'ASC');
                const role = queryData.role;
                if (role && role !== 'all') {
                    buildQuery.andWhere('role = :role', { role: queryData.role });
                }
            });

        this.response.send({
            ...paginate,
            rows: paginate.rows.map((row) => {
                return {
                    ...row,
                    imageUrl: row.imageUrl,
                };
            }),
        });
    }

    public async saveUser() {
        const id = this.request.params.id;
        const data = this.request.body;
        const cid = this.user.companyId;
        let lastId = 0;

        isValid(data, {
            username: [isRequired(), isMin(4), isMax(20), isExists('user', 'username', `company_id = :cid `, { cid })],
            name: isRequired(),
            role: isIn(UserRole),
        });

        if (Number(id)) {
            const user = await getConnection()
                .getRepository(User)
                .createQueryBuilder('user')
                .where('`id` = :id AND `company_id` = :cid', { id, cid })
                .getOne();

            if (!user) {
                throw new UserNotFoundError();
            }
            user.name = data.name;
            user.role = data.role;
            await user.save();
            lastId = Number(data.id);
            eventUser.emit('save.after', user);
        } else {
            const userEntity = new User();
            userEntity.username = data.username;
            userEntity.name = data.name;
            userEntity.companyId = cid;
            userEntity.role = data.role;
            userEntity.setPassword(data.password);
            const user = await userEntity.save();
            lastId = user.id;
            eventUser.emit('save.after', userEntity);
        }

        this.response.send({ id: lastId });
    }

    public async updatePassword() {
        const id = this.request.params.id;
        const data = this.request.body;
        const cid = this.user.companyId;

        const user = this.user;
        if (!user.isSupervisor) {
            throw new ForbiddenError();
        }

        isValid(data, {
            newPassword: [isRequired(), isMin(4), isMax(20)],
        });

        const row = await getConnection()
            .getRepository(User)
            .createQueryBuilder('user')
            .where('`id` = :id AND `company_id` = :cid', { id, cid })
            .getOne();
        if (!row) {
            throw new UserNotFoundError();
        }
        row.setPassword(data.newPassword);
        await row.save();
        eventUser.emit('logout', row);
        eventUser.emit('save.after', row);
        this.response.sendStatus(StatusCode.NoContent);
    }

    public async toggleEnabled() {
        const id = this.request.params.id;
        const data = this.request.body;
        const cid = this.user.companyId;

        const user = this.user;
        if (!user.isSupervisor) {
            throw new ForbiddenError();
        }

        const row = await getConnection()
            .getRepository(User)
            .createQueryBuilder('user')
            .where('`id` = :id AND `company_id` = :cid', { id, cid })
            .getOne();
        if (!row) {
            throw new UserNotFoundError();
        }
        row.enabled = data.enabled === true;
        await row.save();
        eventUser.emit('logout', row);
        eventUser.emit('save.after', row);
        this.response.sendStatus(StatusCode.NoContent);
    }
}
