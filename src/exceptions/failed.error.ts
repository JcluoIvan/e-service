import { BaseError, StatusCode } from '.';

export class FailedError extends BaseError {
    public statusCode = StatusCode.BadRequest;

    public message = 'failed';
}
