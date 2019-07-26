import BaseController from './BaseController';
import { Article } from '../entity/Article';
import { getConnection } from 'typeorm';
import { ArticleNotFoundError } from '../exceptions/article.error';
import * as validator from 'validator';
import { StatusCode } from '../exceptions';
import logger from '../logger';

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
        if (Number(id)) {
            const article = await getConnection()
                .getRepository(Article)
                .createQueryBuilder('article')
                .where('id = :id', { id })
                .getOne();
            if (!article) {
                throw new ArticleNotFoundError();
            }
            article.key = data.key;
            article.content = data.content;
            article.share = data.share;
            await article.save();
            lastId = Number(data.id);
        } else {
            const articleEntity = new Article();
            articleEntity.companyId = this.utoken.user.companyId;
            articleEntity.userId = this.utoken.user.id;
            articleEntity.key = data.key;
            articleEntity.content = data.content;
            articleEntity.share = data.share;
            const article = await articleEntity.save();
            lastId = article.id;
        }

        this.response.send({ id: lastId });
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
