import BaseController from './BaseController';
import { getConnection, getCustomRepository } from 'typeorm';
import { StatusCode } from '../exceptions';
import logger from '../config/logger';
import { User, UserRole } from '../entity/User';
import { UserNotFoundError } from '../exceptions/login.errors';
import { UserRepository } from '../repository/UserRepository';
import { isValid, isRequired, isMax, isMin, isIn, isWhen } from '../validations';
import { TalkRepository } from '../repository/TalkRepository';
import { Message } from '../entity/Message';
import { MessageRepository } from '../repository/MessageRepository';
import { Talk } from '../entity/Talk';
import { TalkNotFoundError } from '../exceptions/center.error';

export default class TalkController extends BaseController {
    public async findTalk() {
        const id = this.request.params.tid;
        const talk = await getConnection()
            .getCustomRepository(TalkRepository)
            .findTalk(id, this.user.companyId);
        if (!talk) {
            throw new UserNotFoundError();
        }
        this.response.send(talk);
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

    public async listAfterMessages() {
        const cid = this.user.companyId;
        const tid = this.request.params.tid;
        const mid = this.request.params.mid;
        const qdata = this.request.query || {};

        const size = Number(qdata.size || 20) || 20;

        const exists = await getConnection()
            .getCustomRepository(TalkRepository)
            .findTalk(tid, cid);
        if (!exists) {
            throw new TalkNotFoundError();
        }

        const query = await getConnection()
            .createQueryBuilder(Message, 'msg')
            .where('msg.talk_id = :tid AND msg.id > :mid', { tid, mid });

        const remaining = (await query.getCount()) - size;
        const rows = await query
            .leftJoinAndMapOne('msg.user', 'user', 'u', 'u.id = msg.user_id')
            .orderBy('msg.id', 'ASC')
            .take(size)
            .getMany();
        this.response.send({
            rows: rows.map((row) => ({
                ...row,
                content: row.getContent(),
            })),
            remaining: Math.max(remaining, 0),
        });
    }

    public async listBeforeMessages() {
        const cid = this.user.companyId;
        const tid = this.request.params.tid;
        const mid = this.request.params.mid;
        const qdata = this.request.query || {};

        const size = Number(qdata.size || 20) || 20;

        const exists = await getConnection()
            .getCustomRepository(TalkRepository)
            .findTalk(tid, cid);
        if (!exists) {
            throw new TalkNotFoundError();
        }
        const query = await getConnection()
            .createQueryBuilder(Message, 'msg')
            .where('msg.talk_id = :tid', { tid });
        if (mid > 0) {
            query.andWhere('msg.id < :mid', { mid });
        }

        const remaining = (await query.getCount()) - size;
        const rows = await query
            .leftJoinAndMapOne('msg.user', 'user', 'u', 'u.id = msg.user_id')
            .orderBy('msg.id', 'DESC')
            .take(size)
            .getMany();
        this.response.send({
            rows: rows.map((row) => ({
                ...row,
                content: row.getContent(),
            })),
            remaining: Math.max(remaining, 0),
        });
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
