import { BaseError, StatusCode } from '.';

export class UnknownCompanyOrTokenError extends BaseError {
    public message = 'unknown company or token';
    public statusCode = StatusCode.Unauthorized;
}
