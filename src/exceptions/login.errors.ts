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

// tslint:disable-next-line:max-classes-per-file
export class UserDisabledError extends BaseError {
    public message = 'user is disabled';
}

// tslint:disable-next-line:max-classes-per-file
export class UserErrorLockedError extends BaseError {
    public message = '密碼錯誤超過 5 次, 帳號禁止登入';
}
