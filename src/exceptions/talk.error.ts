import { BaseError, StatusCode } from '.';

export class TalkNotFoundError extends BaseError {
    public statusCode = StatusCode.NotFound;
    public message = 'talk not found.';
}
// tslint:disable-next-line:max-classes-per-file
export class MessageNotFoundError extends BaseError {
    public statusCode = StatusCode.NotFound;
    public message = 'message not found.';
}


// tslint:disable-next-line:max-classes-per-file
export class UnauthorizedEditMessageError extends BaseError {
    public statusCode = StatusCode.Unauthorized;
    public message = 'insufficient permission to edit message';
}
