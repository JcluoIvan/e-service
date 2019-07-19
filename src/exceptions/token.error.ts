import { BaseError } from '.';

export class SocketUndefinedError extends BaseError {
    public message = 'socket is undefined';
}
