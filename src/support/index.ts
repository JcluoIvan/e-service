import logger from '../logger';
import { BaseError } from '../exceptions';

export const throwError = (err: BaseError): ISK.Response.Data => {
    return {
        code: err.code,
        message: err.message,
    };
};

export const responseSuccess = <T = any>(data: T, message?: string): ISK.Response.Data<T> => {
    return {
        code: 0,
        data,
        message,
    };
};
