import BaseController from './BaseController';
import { Article, AutoSend } from '../entity/Article';
import { getConnection } from 'typeorm';
import { ArticleNotFoundError } from '../exceptions/article.error';
import { StatusCode } from '../exceptions';
import logger from '../config/logger';
import { eventArticle } from '../events/event-article';

const getAutoSend = (autoSend: any, def = AutoSend.None): AutoSend => {
    return (
        {
            [AutoSend.None]: AutoSend.None,
            [AutoSend.Start]: AutoSend.Start,
            [AutoSend.Connected]: AutoSend.Connected,
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
        const rows = await getConnection()
            .getRepository(Article)
            .createQueryBuilder()
            .getMany();
        this.response.send(rows);
    }

    public async saveArticle() {
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
            articleEntity.content = data.content;
            articleEntity.share = data.share;
            const article = await articleEntity.save();
            lastId = Number(data.id);
            eventArticle.emit('save.after', article);
        } else {
            const articleEntity = new Article();
            articleEntity.companyId = this.utoken.user.companyId;
            articleEntity.userId = this.utoken.user.id;
            articleEntity.autoSend = autoSend;
            articleEntity.key = data.key;
            articleEntity.content = data.content;
            articleEntity.share = data.share;
            const article = await articleEntity.save();
            lastId = article.id;
            eventArticle.emit('save.after', article);
        }
        this.response.send({ id: lastId });
    }

    public async updateAutoSend() {
        const id = this.request.params.id;
        const data = this.request.body;
        const autoSend = getAutoSend(data.autoSend);
        const articleEntity = await getConnection()
            .getRepository(Article)
            .createQueryBuilder('article')
            .where('id = :id', { id })
            .getOne();
        if (articleEntity) {
            articleEntity.autoSend = autoSend;
            const article = await articleEntity.save();
            eventArticle.emit('save.after', article);
        }
        this.response.sendStatus(StatusCode.NoContent);
    }

    public async deleteArticle() {
        const id = this.request.params.id;

        await getConnection()
            .createQueryBuilder()
            .delete()
            .from(Article)
            .where('id = :id', { id })
            .execute();
        this.response.sendStatus(StatusCode.NoContent);
    }
}
