import { isObject, isString } from 'util';
import { ValidationError } from '../exceptions/validation.error';
import logger from '../config/logger';

// export const exists = ()
export type ValidationFunction = (value: any, key: string, data: any) => true | string;
export interface ValidationSetting {
    [key: string]: ValidationFunction | ValidationFunction[];
}

export const isRequired = (): ValidationFunction => {
    return (value, key) => !!value || '此欄位需為必填';
};

export const isWhen = (when: ValidationFunction, rules: ValidationFunction[]): ValidationFunction => {
    return (...args) => {
        if (!when(...args)) {
            return true;
        }
        const res = rules.map((r) => r(...args)).filter((r) => r !== true);
        return res.length === 0 || res[0];
    };
};

export const isMax = (max: number): ValidationFunction => {
    return (value) =>
        isString(value) ? value.length <= max || `長度不能超過 ${max} 個字元` : value < max || `不得大於 ${max}`;
};

export const isMin = (min: number): ValidationFunction => {
    return (value) =>
        isString(value) ? value.length >= min || `長度不能少於 ${min} 個字元` : value < min || `不得小於 ${min}`;
};

export const isIn = (enums: string[] | number[] | object): ValidationFunction => {
    const enumsArr = Array.isArray(enums) ? enums : Array.from(Object.values(enums));
    return (value) => enumsArr.indexOf(value) >= 0 || '資料不正確';
};

export const isValid = (data: any, setting: ValidationSetting) => {
    const errors: { [key: string]: string[] } = {};
    Object.keys(setting).forEach((key) => {
        const value = key in data ? data[key] : undefined;
        const items: ValidationFunction[] = (Array.isArray(setting[key]) ? setting[key] : [setting[key]]) as any;
        const errs: string[] = [];
        items.every((item) => {
            const { validator, args = [] } = 'validator' in item ? item : { validator: item };

            const res = validator(value, key, data);
            if (res !== true) {
                errs.push(res);
                return false;
            }
            return true;
        });
        if (errs.length > 0) {
            errors[key] = errs;
        }
    });

    if (Object.keys(errors).length !== 0) {
        throw new ValidationError().setErrors(errors);
    }
};
