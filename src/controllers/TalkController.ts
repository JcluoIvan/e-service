import BaseController from './BaseController';
import { getConnection, getCustomRepository } from 'typeorm';
import { StatusCode } from '../exceptions';
import logger from '../config/logger';
import { User, UserRole } from '../entity/User';
import { UserNotFoundError } from '../exceptions/login.errors';
import { UserRepository } from '../repository/UserRepository';
import { isValid, isRequired, isMax, isMin, isIn, isWhen } from '../validations';
import { TalkRepository } from '../repository/TalkRepository';
import { Message, MessageType } from '../entity/Message';
import { MessageRepository } from '../repository/MessageRepository';
import { Talk } from '../entity/Talk';
import { TalkNotFoundError } from '../exceptions/center.error';
import { UnauthorizedEditMessageError } from '../exceptions/talk.error';

const existsTalk = async (companyId: number, talkId: number) => {
    const nums = await getConnection()
        .createQueryBuilder(Talk, 't')
        .where('t.id = :tid AND t.company_id = :cid', { tid: talkId, cid: companyId })
        .getCount();
    return nums === 1;
};

const existsMessage = async (companyId: number, talkId: number, messageId: number) => {
    const isExists = await existsTalk(companyId, talkId);
    if (!isExists) {
        return false;
    }
    const nums = await getConnection()
        .createQueryBuilder(Message, 'm')
        .where('m.id = :mid AND m.talk_id = :tid', {
            mid: messageId,
            tid: talkId,
        })
        .getCount();
    return nums === 1;
};

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
                    .leftJoinAndMapOne('talk.customer', 'customer', 'ct', 'ct.id = talk.customer_id')
                    .leftJoinAndMapOne('talk.executive', 'user', 'u', 'u.id = talk.executive_id');
            });
        this.response.send(res);
    }

    public async listAfterMessages() {
        const cid = this.user.companyId;
        const tid = this.request.params.tid;
        const mid = Number(this.request.params.mid) || 0;
        const qdata = this.request.query || {};

        const size = Number(qdata.size || 20) || 20;

        const talk = await getConnection()
            .getCustomRepository(TalkRepository)
            .findTalk(tid, cid);
        if (!talk) {
            throw new TalkNotFoundError();
        }
        const customerId = talk.customerId;

        const query = await getConnection().createQueryBuilder(Message, 'msg');

        if (mid > 0) {
            query.andWhere('msg.id > :mid', { mid });
        } else {
            query.andWhere('msg.talk_id >= :tid', { tid });
        }

        query.andWhere('msg.talk_id IN (SELECT id FROM `talk` AS tk WHERE tk.customer_id = :customerId)', {
            customerId,
        });

        const remaining = (await query.getCount()) - size;
        const rows = await query
            .leftJoinAndMapOne('msg.user', 'user', 'u', 'u.id = msg.user_id')
            .orderBy('msg.id', 'ASC')
            .take(size)
            .getMany();

        const talkIds = rows.reduce<number[]>((ids, r) => (ids.indexOf(r.talkId) >= 0 ? ids : [...ids, r.talkId]), []);

        const talks = talkIds.length
            ? await getConnection()
                  .createQueryBuilder(Talk, 'talk')
                  .whereInIds(talkIds)
                  .getMany()
            : [];

        this.response.send({
            rows: rows.map((row) => ({
                ...row,
                content: row.getContent(),
            })),
            talks,
            remaining: Math.max(remaining, 0),
        });
    }

    public async listBeforeMessages() {
        const cid = this.user.companyId;
        const tid = this.request.params.tid;
        const mid = Number(this.request.params.mid) || 0;
        const qdata = this.request.query || {};

        const size = Number(qdata.size || 20) || 20;

        const talk = await getConnection()
            .getCustomRepository(TalkRepository)
            .findTalk(tid, cid);
        if (!talk) {
            throw new TalkNotFoundError();
        }
        const customerId = talk.customerId;

        const query = await getConnection().createQueryBuilder(Message, 'msg');
        if (mid > 0) {
            query.andWhere('msg.id < :mid', { mid });
        } else {
            query.andWhere('msg.talk_id <= :tid', { tid });
        }

        query.andWhere('msg.talk_id IN (SELECT id FROM `talk` AS tk WHERE tk.customer_id = :customerId)', {
            customerId,
        });

        const remaining = (await query.getCount()) - size;
        const rows = await query
            .leftJoinAndMapOne('msg.user', 'user', 'u', 'u.id = msg.user_id')
            .orderBy('msg.id', 'DESC')
            .take(size)
            .getMany();

        const talkIds = rows.reduce<number[]>((ids, r) => (ids.indexOf(r.talkId) >= 0 ? ids : [...ids, r.talkId]), []);

        const talks = talkIds.length
            ? await getConnection()
                  .createQueryBuilder(Talk, 'talk')
                  .whereInIds(talkIds)
                  .getMany()
            : [];

        this.response.send({
            rows: rows.map((row) => ({
                ...row,
                content: row.getContent(),
            })),
            talks,
            remaining: Math.max(remaining, 0),
        });
    }

    public async updateMessage() {
        const tid = this.request.params.tid;
        const mid = this.request.params.mid;
        const data = this.request.body;
        const cid = this.user.companyId;

        if (!this.user.isSupervisor) {
            throw new UnauthorizedEditMessageError();
        }

        const isExists = await existsMessage(cid, tid, mid);
        if (!isExists) {
            throw new TalkNotFoundError();
        }

        const content = (data && data.content) || '';

        await getConnection()
            .createQueryBuilder()
            .update(Message)
            .set({
                content,
                type: MessageType.Text,
            })
            .where('id = :mid', { mid })
            .execute();
        this.response.sendStatus(StatusCode.NoContent);
    }

    public async deleteMessage() {
        const tid = this.request.params.tid;
        const mid = this.request.params.mid;
        const cid = this.user.companyId;

        if (!this.user.isSupervisor) {
            throw new UnauthorizedEditMessageError();
        }

        const isExists = await existsMessage(cid, tid, mid);
        if (!isExists) {
            throw new TalkNotFoundError();
        }

        await getConnection()
            .createQueryBuilder()
            .delete()
            .from(Message)
            .where('id = :mid', { mid })
            .execute();
        this.response.sendStatus(StatusCode.NoContent);
    }
}
