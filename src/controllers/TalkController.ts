import BaseController from './BaseController';
import { getConnection } from 'typeorm';
import { StatusCode } from '../exceptions';
import logger from '../config/logger';
import { User, UserRole } from '../entity/User';
import { UserNotFoundError } from '../exceptions/login.errors';
import { UserRepository } from '../repository/UserRepository';
import { isValid, isRequired, isMax, isMin, isIn, isWhen } from '../validations';
import { TalkRepository } from '../repository/TalkRepository';

export default class TalkController extends BaseController {
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

    public async listTalks() {
        const queryData = this.request.query || {};
        const res = await getConnection()
            .getCustomRepository(TalkRepository)
            .paginate('talk', queryData, (buildQuery) => {
                buildQuery
                    .where('talk.company_id = :cid', { cid: this.user.companyId })
                    .addOrderBy('talk.id', 'DESC')
                    .leftJoinAndMapOne('talk.customer', 'customer', 'ct', 'ct.id = talk.customer_id');
            });
        this.response.send(res);
    }

    public async saveUser() {
        const id = this.request.params.id;
        const data = this.request.body;
        const cid = this.user.companyId;
        let lastId = 0;

        isValid(data, {
            username: id ? [] : [isRequired(), isMin(4), isMax(20)],
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
        } else {
            const userEntity = new User();
            userEntity.username = data.username;
            userEntity.name = data.name;
            userEntity.companyId = cid;
            userEntity.setPassword(data.password);
            const user = await userEntity.save();
            lastId = user.id;
        }

        this.response.send({ id: lastId });
    }

    public async toggleEnabled() {
        const id = this.request.params.id;
    }

    public async deleteArticle() {
        const id = this.request.params.id;
        const cid = this.user.companyId;

        await getConnection()
            .createQueryBuilder()
            .delete()
            .from(User)
            .where('id = :id AND companyId = :cid', { id, cid })
            .execute();
        this.response.sendStatus(StatusCode.NoContent);
    }
}