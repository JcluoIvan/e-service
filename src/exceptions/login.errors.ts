import { BaseError } from '.';

export class LoginFailedError extends BaseError {
    public message = 'invalid username or password';
}
