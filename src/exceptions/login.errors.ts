import { BaseError } from '.';

export class LoginFailedError extends BaseError {
    public message = 'invalid username or password';
}

// tslint:disable-next-line:max-classes-per-file
export class AssignUserTokenError extends BaseError {
    public message = 'error user id';
}

// tslint:disable-next-line:max-classes-per-file
export class UserNotFoundError extends BaseError {
    public message = 'user not found';
}
