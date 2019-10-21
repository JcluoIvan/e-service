import logger from '../config/logger';
import { BaseError } from '../exceptions';

export const throwError = (err: BaseError): ISK.Response.Data => {
    return {
        code: err.code,
        message: err.message,
    };
};

export const responseSuccess = <T = any>(data: T, message?: string): ISK.Response.Data<T> => {
    return {
        code: 0,
        data,
        message,
    };
};
export const ipAddress = (handshake: SocketIO.Handshake) => {
    return (handshake.headers['x-forwarded-for'] || handshake.address).replace(/^\:\:ffff\:/, '');
};

export const ip2int = (ip: string) => {
    // tslint:disable-next-line:no-bitwise
    return ip.split('.').reduce((ipint: number, octet: string) => (ipint << 8) + Number(octet), 0) >>> 0;
};

export const int2ip = (ipint: number) => {
    // tslint:disable-next-line:no-bitwise
    return `${ipint >>> 24}.${(ipint >> 16) & 255}.${(ipint >> 8) & 255}.${ipint & 255}`;
};
