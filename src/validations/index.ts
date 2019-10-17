import { isObject, isString } from 'util';
import { ValidationError } from '../exceptions/validation.error';
import logger from '../config/logger';
import { getConnection } from 'typeorm';

// export const exists = ()
export type ValidationFunction = (value: any, key: string, data: any) => Promise<true | string> | true | string;
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

export const isExists = (table: string, col?: string, where?: string, values?: any): ValidationFunction => {
    return async (value, key) => {
        let sql = `SELECT count(1) AS c FROM \`${table}\` WHERE \`${key}\` = ? `;
        if (where) {
            sql += ` AND ${where}`;
        }
        const res = values ? await getConnection().query(sql, values) : await getConnection().query(sql);
        logger.info('xxx', res);

        return true as any;
    };
};

export const isValid = async (data: any, setting: ValidationSetting) => {
    return new Promise((resolve, reject) => {
        const errors: { [key: string]: string[] } = {};
        const allCheck = Object.keys(setting).map(async (key) => {
            const value = key in data ? data[key] : undefined;
            const items: ValidationFunction[] = (Array.isArray(setting[key]) ? setting[key] : [setting[key]]) as any;
            const errs: string[] = [];

            const checks = items.map(async (item) => {
                const { validator, args = [] } = 'validator' in item ? item : { validator: item };

                const res = await validator(value, key, data);
                if (res !== true) {
                    errs.push(res);
                    return false;
                }
                return true;
            });
            Promise.all(checks).finally(() => {
                if (errs.length > 0) {
                    errors[key] = errs;
                }
            });
        });

        Promise.all(allCheck).finally(() => {
            if (Object.keys(errors).length !== 0) {
                reject(new ValidationError().setErrors(errors));
            }
        });
    });
};
