import { BaseError } from '.';

export class TaskNotFoundError extends BaseError {
    public message = 'task not found';
}

// tslint:disable-next-line:max-classes-per-file
export class NotInTaskError extends BaseError {
    public message = 'you are not in this task';
}

// tslint:disable-next-line:max-classes-per-file
export class RoomDisconnectError extends BaseError {
    public message = 'no body in room';
}
