import { BaseError, ResponseCode } from '.';

export class ValidationError extends BaseError {
    public code = ResponseCode.Validation;
    public errors: any;
    public setErrors(errors: any) {
        this.errors = errors;
        return this;
    }
}
