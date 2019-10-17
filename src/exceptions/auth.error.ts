import { BaseError, StatusCode } from '.';

export class UnknownCompanyOrTokenError extends BaseError {
    public message = 'unknown company or token';
    public statusCode = StatusCode.Unauthorized;
}

// tslint:disable-next-line:max-classes-per-file
export class ForbiddenError extends BaseError {
    public message = 'forbidden';
    public statusCode = StatusCode.Forbidden;
}
