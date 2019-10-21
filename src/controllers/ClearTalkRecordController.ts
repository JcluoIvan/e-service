import BaseController from './BaseController';
import { getConnection } from 'typeorm';
import logger = require('fancy-log');
import moment = require('moment');
import { Talk } from '../entity/Talk';
import { StatusCode } from '../exceptions';
interface DeleteRecordItem {
    year: number;
    month: number;
}
export default class ClearTalkRecordController extends BaseController {
    public async all() {
        const sql = `
        SELECT YEAR(created_at) AS \`year\`, MONTH(created_at) AS \`month\`, COUNT(1) AS \`count\`
        FROM (
            SELECT created_at
            FROM talk
            WHERE company_id = ?
        ) AS tab
        GROUP BY \`year\`, \`month\`
        ORDER BY \`year\` DESC, \`month\` DESC`;
        const cid = this.user.companyId;
        const res = await getConnection().query(sql, [cid]);
        const rows = (res || []).map((o: any) => {
            return {
                year: Number(o.year),
                month: Number(o.month),
                count: Number(o.count),
            };
        });
        this.response.send(rows);
    }

    public async deleteRecords() {
        const data = this.request.body;
        const items: DeleteRecordItem[] = data.items || [];
        // const values = [this.user.companyId];
        const cid = this.user.companyId;
        const wheres: string[] = [];

        this.checkUserIsSupervisor();

        items.forEach((o) => {
            const stime = moment()
                .set('year', o.year)
                .set('month', o.month - 1)
                .startOf('month');
            const etime = stime.clone().endOf('month');
            wheres.push(`(created_at BETWEEN '${stime.format('Y-MM-DD')}' AND '${etime.format('Y-MM-DD 23:59:59')}')`);
        });

        await getConnection()
            .createQueryBuilder()
            .delete()
            .from(Talk)
            .where(`company_id = :cid AND (${wheres.join(' OR ')})`, { cid })
            .execute();

        this.response.sendStatus(StatusCode.NoContent);
    }
}
