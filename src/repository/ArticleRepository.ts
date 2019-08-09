import { EntityRepository, getConnection } from 'typeorm';
import BaseRepository from './BaseRepository';
import { Article, AutoSend } from '../entity/Article';

@EntityRepository(Article)
export class ArticleRepository extends BaseRepository<Article> {
    public async updateOdr(companyId: number, type: AutoSend) {
        await getConnection().query('set @odr := 0');
        await getConnection().query(
            `UPDATE article SET odr = (@odr := @odr + 10) WHERE company_id = ? AND auto_send = ? ORDER BY odr`,
            [companyId, type],
        );
    }
}
