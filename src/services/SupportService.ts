import UserService from './UserService';
import { User, UserRole } from '../entity/User';
import logger from '../logger';
import UserToken from './tokens/UserToken';
import { getConnection } from 'typeorm';
import { Article } from '../entity/Article';
import BaseService from './BaseService';

export default class SupportService extends BaseService {
    constructor(private userService: UserService) {
        super();
        userService.on('connected', ({ utoken }) => {
            this.updateArticle(utoken);
        });
    }

    /**
     * 更新成員的預存文章
     * @param utoken
     */
    public async updateArticle(utoken: UserToken) {
        const rows = await getConnection()
            .getRepository(Article)
            .createQueryBuilder('article')
            .where('company_id = :companyId', { companyId: utoken.user.companyId })
            .andWhere('(share = 1 OR user_id = :userId)', { userId: utoken.user.id })
            .getMany();

        const articles: IUser.Socket.EmitterData.Support.Article[] = rows.map((row) => {
            return {
                id: row.id,
                share: row.share,
                key: row.key,
                content: row.content,
            };
        });

        utoken.socket.emit('support/articles', articles);
    }
}
