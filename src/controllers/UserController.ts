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
import { LogUserLogin } from '../entity/LogUserLogin';
import { LogUserLoginRepository } from '../repository/LogUserLoginRepository';
import { IpsRepository } from '../repository/IpsRepository';
import moment = require('moment');

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
        const user = this.user;
        const paginate = await getConnection()
            .getCustomRepository(UserRepository)
            .listUsers(user, queryData, (buildQuery) => {
                const role = user.isSupervisor ? queryData.role : UserRole.Executive;
                if (role && role !== 'all') {
                    buildQuery.andWhere('role = :role', { role });
                }
            });
        const rows = paginate.rows.map((row) => ({ row, ip: (row.logLast && row.logLast.ip) || null }));
        await getConnection()
            .getCustomRepository(IpsRepository)
            .joinIps(rows, (ips, o) => {
                o.row.ipInfo = ips;
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
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        let lastId = 0;

        this.checkUserIsSupervisor();

        await isValid(data, {
            username: [
                isRequired(),
                isMin(4),
                isMax(20),
                isExists('user', 'username', `company_id = ? AND id != ?`, [cid, id]),
            ],
            name: isRequired(),
            role: isIn(UserRole),
        });

        if (Number(id)) {
            const row = await getConnection()
                .getCustomRepository(UserRepository)
                .findUserOrError(id, cid);

            row.username = data.username;
            row.name = data.name;
            row.role = data.role;
            row.updatedAt = now;
            await row.save();
            lastId = Number(data.id);
            eventUser.emit('save.after', row);
            eventUser.emit('logout', row);
        } else {
            const row = new User();
            row.username = data.username;
            row.name = data.name;
            row.companyId = cid;
            row.role = data.role;
            row.setPassword(data.password);
            row.updatedAt = now;
            row.createdAt = now;
            const user = await row.save();
            lastId = user.id;
            eventUser.emit('save.after', row);
        }

        this.response.send({ id: lastId });
    }

    public async updatePassword() {
        const id = this.request.params.id;
        const data = this.request.body;
        const cid = this.user.companyId;
        const now = moment().format('YYYY-MM-DD HH:mm:ss');

        this.checkUserIsSupervisor();

        await isValid(data, {
            newPassword: [isRequired(), isMin(4), isMax(20)],
        });

        const row = await getConnection()
            .getCustomRepository(UserRepository)
            .findUserOrError(id, cid);

        row.setPassword(data.newPassword);
        row.updatedAt = now;
        await row.save();
        eventUser.emit('logout', row);
        eventUser.emit('save.after', row);
        this.response.sendStatus(StatusCode.NoContent);
    }

    public async toggleEnabled() {
        const id = this.request.params.id;
        const data = this.request.body;
        const cid = this.user.companyId;
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        this.checkUserIsSupervisor();

        const row = await getConnection()
            .getCustomRepository(UserRepository)
            .findUserOrError(id, cid);
        row.enabled = data.enabled === true;
        row.updatedAt = now;
        await row.save();
        eventUser.emit('logout', row);
        eventUser.emit('save.after', row);
        this.response.sendStatus(StatusCode.NoContent);
    }

    public async resetLoginErrors() {
        const id = this.request.params.id;
        const cid = this.user.companyId;
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        this.checkUserIsSupervisor();

        const row = await getConnection()
            .getCustomRepository(UserRepository)
            .findUserOrError(id, cid);
        row.loginErrors = 0;
        row.updatedAt = now;
        await row.save();
        eventUser.emit('save.after', row);
        this.response.sendStatus(StatusCode.NoContent);
    }

    public async logLoginList() {
        const id = Number(this.request.params.id);
        const query = this.request.query;
        const cid = this.user.companyId;
        if (id !== this.user.id) {
            this.checkUserIsSupervisor();
        }

        const paginate = await getConnection()
            .getCustomRepository(LogUserLoginRepository)
            .paginate('log', query, (buildQuery) => {
                buildQuery.where('`user_id` = :id AND `company_id` = :cid', { id, cid }).addOrderBy('id', 'DESC');

                if (query.ip) {
                    buildQuery.andWhere('`ip` = :ip', { ip: query.ip });
                }
            });

        await getConnection()
            .getCustomRepository(IpsRepository)
            .joinIps(paginate.rows, (ips, source) => {
                source.ipInfo = ips;
            });

        this.response.send({
            ...paginate,
        });
    }
}
