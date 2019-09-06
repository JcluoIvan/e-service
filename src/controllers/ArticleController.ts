import BaseController from './BaseController';
import { Article, AutoSend } from '../entity/Article';
import { getConnection } from 'typeorm';
import { ArticleNotFoundError, ArticleForbiddenError } from '../exceptions/article.error';
import { StatusCode } from '../exceptions';
import logger from '../config/logger';
import { eventArticle } from '../events/event-article';
import { ArticleRepository } from '../repository/ArticleRepository';
import { User } from '../entity/User';

const getAutoSend = (autoSend: any, def = AutoSend.None): AutoSend => {
    return (
        {
            [AutoSend.None]: AutoSend.None,
            [AutoSend.Start]: AutoSend.Start,
            [AutoSend.Connected]: AutoSend.Connected,
            [AutoSend.Pause]: AutoSend.Pause,
        }[autoSend as AutoSend] || def
    );
};

export default class ArticleController extends BaseController {
    public async findAtricle() {
        const id = this.request.params.id;

        const article = await getConnection()
            .getRepository(Article)
            .createQueryBuilder()
            .where('id = :id', { id })
            .getOne();

        if (!article) {
            throw new ArticleNotFoundError();
        }
        this.response.send(article);
    }

    public async allArticle() {
        const queryData = this.request.query || {};
        const values = {
            cid: this.user.companyId,
            uid: queryData.userId || 0,
        };

        const query = await getConnection()
            .getRepository(Article)
            .createQueryBuilder()
            .where(`company_id = :cid AND (user_id = :uid OR auto_send = 'connected')`, values)
            .orderBy('odr');
        const autoSends = queryData.autoSends;
        if (autoSends) {
            query.andWhere('auto_send IN (:...autos)', { autos: autoSends });
        }

        const rows = await query.getMany();
        this.response.send(rows);
    }

    public async saveArticle() {
        const cid = this.user.companyId;
        const id = this.request.params.id;
        const data = this.request.body;
        let lastId = 0;
        const autoSend = getAutoSend(data.autoSend);
        if (Number(id)) {
            const articleEntity = await getConnection()
                .getRepository(Article)
                .createQueryBuilder('article')
                .where('id = :id', { id })
                .getOne();
            if (!articleEntity) {
                throw new ArticleNotFoundError();
            }
            articleEntity.key = data.key;
            articleEntity.autoSend = autoSend;
            articleEntity.name = data.name;
            articleEntity.content = data.content;
            const article = await articleEntity.save();
            await getConnection()
                .getCustomRepository(ArticleRepository)
                .updateOdr(cid, article.autoSend);
            lastId = Number(article.id);
            await article.reload();
            eventArticle.emit('save.after', article);
        } else {
            const articleEntity = new Article();
            articleEntity.companyId = this.utoken.user.companyId;
            articleEntity.userId = this.utoken.user.id;
            articleEntity.autoSend = autoSend;
            articleEntity.key = data.key;
            articleEntity.name = data.name;
            articleEntity.content = data.content;
            const article = await articleEntity.save();
            await getConnection()
                .getCustomRepository(ArticleRepository)
                .updateOdr(cid, article.autoSend);
            lastId = article.id;
            await article.reload();
            eventArticle.emit('save.after', article);
        }
        this.response.send({ id: lastId });
    }

    public async moveArticle() {
        const cid = this.user.companyId;
        const id = this.request.params.id;
        const data = this.request.body;
        const autoSend = getAutoSend(data.autoSend);
        const odr = data.odr || 0;
        const articleEntity = await getConnection()
            .getRepository(Article)
            .createQueryBuilder('article')
            .where('id = :id', { id })
            .getOne();
        const res: { odr: number; autoSend: AutoSend | null } = { odr: 0, autoSend: null };
        if (articleEntity) {
            articleEntity.autoSend = autoSend;
            articleEntity.odr = odr;
            const article = await articleEntity.save();
            await getConnection()
                .getCustomRepository(ArticleRepository)
                .updateOdr(cid, autoSend);
            await article.reload();
            eventArticle.emit('save.after', article);
            res.odr = article.odr;
            res.autoSend = article.autoSend;
        }
        this.response.send(res);
    }

    public async deleteArticle() {
        const id = this.request.params.id;

        const article = await getConnection()
            .getRepository(Article)
            .createQueryBuilder('article')
            .where('id = :id AND company_id = :cid', { id, cid: this.user.companyId })
            .getOne();
        if (!article) {
            throw new ArticleNotFoundError();
        }

        if (article.userId !== this.user.id) {
            throw new ArticleForbiddenError();
        }

        await getConnection()
            .createQueryBuilder()
            .delete()
            .from(Article)
            .where('id = :id', { id })
            .execute();
        eventArticle.emit('delete.after', article);
        this.response.sendStatus(StatusCode.NoContent);
    }
}
