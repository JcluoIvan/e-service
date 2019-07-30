import { BaseError, ResponseCode } from '.';

export class ResourceNotFoundError extends BaseError {
    public code = ResponseCode.ResourceNotFound;
    public statusCode = 404;
    public message = 'resource not found';
}
