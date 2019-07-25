import UserService from './UserService';
import { User, UserRole } from '../entity/User';
import logger from '../logger';
import UserToken from './tokens/UserToken';
import { getConnection } from 'typeorm';
import { Article } from '../entity/Article';
import BaseService from './BaseService';
import { ArticleNotFoundError } from '../exceptions/article.error';

const articleToJson = (article: Article) => {
    return {
        id: article.id,
        content: article.content,
        share: article.share,
        key: article.key,
    };
};

export default class ArticleService extends BaseService {
    constructor(private userService: UserService) {
        super();
        userService.on('connect', ({ utoken }) => {
            this.updateArticle(utoken);

            utoken.socket.on('article/save', async (data) => {
                try {
                    const article =
                        data.id === 0 ? await this.addArticle(data, utoken.user) : await this.saveArticle(data);
                    utoken.socket.emit('article/one', articleToJson(article));
                } catch (err) {
                    utoken.socket.emit('message/error', { message: err.message });
                }
            });

            utoken.socket.on('article/remove', async (id) => {
                this.removeArticle(id)
                    .then(() => {
                        utoken.socket.emit('article/remove', id);
                    })
                    .catch((err) => {
                        utoken.socket.emit('message/error', { message: err.message });
                    });
            });
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

        utoken.socket.emit('article/all', articles);
    }

    public async saveArticle(data: IUser.Socket.ListenerData.Article.Save) {
        const article = await getConnection()
            .getRepository(Article)
            .createQueryBuilder('article')
            .where('id = :id', { id: data.id })
            .getOne();
        if (!article) {
            throw new ArticleNotFoundError();
        }
        article.key = data.key;
        article.content = data.content;
        article.share = data.share;
        return await article.save();
    }
    public async addArticle(data: IUser.Socket.ListenerData.Article.Save, user: User) {
        const article = new Article();
        article.companyId = user.companyId;
        article.userId = user.id;
        article.key = data.key;
        article.content = data.content;
        article.share = data.share;
        return await article.save();
    }

    public async removeArticle(id: number) {
        return await getConnection()
            .createQueryBuilder()
            .delete()
            .from(Article)
            .where('id = :id', { id })
            .execute();
    }
}
