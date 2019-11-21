import BaseController from './BaseController';
import moment = require('moment');
import { getConnection } from 'typeorm';
import { SystemConfig } from '../entity/SystemConfig';
import { isValid, isRequired, isNum, isMin } from '../validations';
import { StatusCode } from '../exceptions';
import { eventSystemConfig } from '../events/event-system-config';

export default class SystemConfigController extends BaseController {
    public async find() {
        const user = this.user;

        let config = await getConnection()
            .createQueryBuilder(SystemConfig, 'sc')
            .where('company_id = :cid', { cid: user.companyId })
            .getOne();
        if (!config) {
            config = SystemConfig.newSystemConfig(user.companyId);
        }
        this.response.send({
            ...config.getValue(),
        });
    }

    public async save() {
        const user = this.user;
        const now = moment().format('YYYY-MM-DD HH:mm:ss');
        const data = this.request.body;

        await isValid(data, {
            talkConnectLimit: [isRequired([0]), isNum(), isMin(0, Number)],
        });

        let config = await getConnection()
            .createQueryBuilder(SystemConfig, 'sc')
            .where('company_id = :cid', { cid: user.companyId })
            .getOne();
        if (!config) {
            config = SystemConfig.newSystemConfig(user.companyId);
            config.createdAt = now;
        }
        config.updatedAt = now;
        config.updateValue((value) => {
            value.talkConnectLimit = Number(data.talkConnectLimit);
            return value;
        });
        await config.save();
        eventSystemConfig.emit('save.after', config);

        this.response.sendStatus(StatusCode.NoContent);
    }
}
