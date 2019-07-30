export enum StatusCode {
    NoContent = 204,

    BadRequest = 400,
    Unauthorized = 401,
    Forbidden = 403,
    NotFound = 404,
    ServerError = 500,
}
export enum ResponseCode {
    Success = 0,
    UnknownError = 1,
    Validation = 2,
    /* 404 */
    ResourceNotFound = 3,
    /* 405 */
    MethodNotAllowed = 4,
}

export class BaseError extends Error {
    public code = ResponseCode.UnknownError;
    public statusCode: number | StatusCode = StatusCode.ServerError;
}
