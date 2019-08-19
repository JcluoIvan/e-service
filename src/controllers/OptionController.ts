import BaseController from './BaseController';
import { getConnection } from 'typeorm';
import { User } from '../entity/User';

export default class OptionController extends BaseController {
    public async userOptions() {
        const users = await getConnection()
            .createQueryBuilder(User, 'user')
            .where('company_id = :cid', { cid: this.user.companyId })
            .getMany();

        const options = users.map((u) => {
            return {
                value: u.id,
                label: u.username,
                usernam: u.username,
                name: u.name,
            };
        });
        this.response.send(options);
    }
}
