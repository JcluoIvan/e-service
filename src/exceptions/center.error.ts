import { BaseError } from '.';

export class TalkNotFoundError extends BaseError {
    public message = 'talk not found';
}

// tslint:disable-next-line:max-classes-per-file
export class NotInTalkError extends BaseError {
    public message = 'you are not in this talk';
}

// tslint:disable-next-line:max-classes-per-file
export class RoomDisconnectError extends BaseError {
    public message = 'no body in room';
}
