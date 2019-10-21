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
import { UnauthorizedEditMessageError, MessageNotFoundError } from '../exceptions/talk.error';
import { IpsRepository } from '../repository/IpsRepository';

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
        const values = {
            tid: this.request.params.tid,
            cid: this.user.companyId,
        };
        const talk = await getConnection()
            .createQueryBuilder(Talk, 'talk')
            .leftJoinAndMapOne('talk.executive', 'user', 'usr', 'usr.id = talk.executive_id')
            .where('talk.id = :tid AND talk.company_id = :cid', values)
            .getOne();
        if (!talk) {
            throw new UserNotFoundError();
        }
        this.response.send(talk);
    }

    public async listTalks() {
        const qdata = this.request.query || {};
        const res = await getConnection()
            .getCustomRepository(TalkRepository)
            .paginate('talk', qdata, async (buildQuery) => {
                buildQuery
                    .where('talk.company_id = :cid', { cid: this.user.companyId })
                    .addOrderBy('talk.id', 'DESC')
                    .leftJoinAndMapOne('talk.customer', 'customer', 'ct', 'ct.id = talk.customer_id')
                    .leftJoinAndMapOne('talk.executive', 'user', 'u', 'u.id = talk.executive_id');

                if (qdata.stime) {
                    buildQuery.andWhere('talk.created_at >= :stime', { stime: qdata.stime });
                }

                if (qdata.etime) {
                    buildQuery.andWhere('talk.created_at <= :etime', { etime: qdata.etime });
                }

                if (qdata.ip) {
                    buildQuery.andWhere('talk.ip = :ip', { ip: qdata.ip });
                }

                if (qdata.waitingOperator && qdata.waitingTime && !isNaN(qdata.waitingTime)) {
                    const whereSql =
                        qdata.waitingOperator === 'above' ? 'talk.time_waiting >= :time' : 'talk.time_waiting <= :time';
                    buildQuery.andWhere(whereSql, {
                        time: qdata.waitingTime * 1000,
                    });
                }
                if (qdata.executiveUsername) {
                    const user = await getConnection()
                        .createQueryBuilder(User, 'usr')
                        .where('usr.username = :username', { username: qdata.executiveUsername })
                        .getOne();
                    const executiveId = user ? user.id : -1;
                    buildQuery.andWhere('talk.executive_id = :executiveId', { executiveId });
                }
                if (qdata.status) {
                    buildQuery.andWhere('talk.status IN (:...status)', { status: qdata.status });
                } else {
                    buildQuery.andWhere(' 0 ');
                }
            });
        await getConnection()
            .getCustomRepository(IpsRepository)
            .joinIps(res.rows, (ips, source) => {
                source.ipInfo = ips;
            });
        this.response.send({ ...res });
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
                user: row.user
                    ? {
                          id: row.user.id,
                          name: row.user.name,
                          imageUrl: row.user.imageUrl,
                      }
                    : null,
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
                user: row.user
                    ? {
                          id: row.user.id,
                          name: row.user.name,
                          imageUrl: row.user.imageUrl,
                      }
                    : null,
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
            throw new MessageNotFoundError();
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
