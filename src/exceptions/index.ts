export enum StatusCode {
    NoContent = 204,

    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    ServerError = 500,
}

export class BaseError extends Error {
    public code: number = 1;
    public statusCode: number | StatusCode = StatusCode.ServerError;
}
