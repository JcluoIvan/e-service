import { BaseError } from '.';

export class ArticleNotFoundError extends BaseError {
    public message = 'article not found';
}

// tslint:disable-next-line:max-classes-per-file
export class ArticleForbiddenError extends BaseError {
    public message = '無此文章的操作權限';
}
