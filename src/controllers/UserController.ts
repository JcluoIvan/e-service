import BaseController from './BaseController';
import { getConnection } from 'typeorm';
import { StatusCode } from '../exceptions';
import logger from '../logger';
import { User } from '../entity/User';
import { UserNotFoundError } from '../exceptions/login.errors';
import { UserRepository } from '../repository/UserRepository';

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
        const rows = await getConnection()
            .getCustomRepository(UserRepository)
            .paginate(this.request.query, (query) => {
                query.where('company_id = :cid', { cid: this.user.companyId });
            });

        // const query = await getConnection()
        //     .getRepository(User)
        //     .
        //     .createQueryBuilder()
        //     .select(selects)
        //     .where('companyId = :cid', { cid: this.user.id });
        // const rows = await paginateQuery(query, this.request);

        this.response.send(rows);
    }

    public async saveUser() {
        const id = this.request.params.id;
        const data = this.request.body;
        const cid = this.user.companyId;
        let lastId = 0;
        if (Number(id)) {
            const user = await getConnection()
                .getRepository(User)
                .createQueryBuilder('user')
                .where('id = :id AND companyId = :cid', { id, cid })
                .getOne();

            if (!user) {
                throw new UserNotFoundError();
            }
            user.username = data.username;
            user.name = data.name;
            user.setPassword(data.password);
            await user.save();
            lastId = Number(data.id);
        } else {
            const userEntity = new User();
            userEntity.companyId = this.utoken.user.companyId;
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
