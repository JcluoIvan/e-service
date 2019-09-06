import { Request, Response, NextFunction } from 'express';
import UserToken from '../services/tokens/UserToken';
import { mapCompanys } from '../services/NamespaceService';
import { UnknownCompanyOrTokenError } from '../exceptions/auth.error';
import ArticleController from './ArticleController';
import logger from '../config/logger';

// tslint:disable-next-line:ban-types
type ObjectType<T> = (new () => T) | Function;
type RouteFunction = (req: Request, res: Response, next: NextFunction) => Promise<void>;
// type
export const handlerController = <T extends BaseController>(ControllerClass: ObjectType<T>) => {
    return (cb: (ctrl: T) => Promise<void>) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                cb(new (ControllerClass as any)(req, res, next)).catch(next);
            } catch (err) {
                next(err);
            }
        };
    };
};
export const handlerClosure = (cb: RouteFunction) => {
    return async (req: Request, res: Response, next: NextFunction) => cb(req, res, next).catch(next);
};

export default class BaseController {
    protected utoken!: UserToken;

    get user() {
        return this.utoken.user;
    }

    constructor(protected request: Request, protected response: Response, next: NextFunction) {
        const token: string = request.query.token;
        const cid: number = Number(request.query.cid) || 0;
        const cp = mapCompanys.get(cid);

        if (!cp) {
            throw new Error(`not found cp > ${cid}`);
        }

        // const utoken = cp && cp.userService.users[0] || null;

        const utoken = (cp && cp.userService.findByToken(token)) || null;
        if (!utoken) {
            throw new UnknownCompanyOrTokenError();
        }
        this.utoken = utoken;
    }
}
