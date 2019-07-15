import logger from '../logger';
import { BaseError } from '../exceptions';

export const socketEventMiddleware = <T extends SocketIO.Socket>(
    socket: SocketIO.Socket,
    middlewareCallback: (response: SIO.ResponseHandle, next: () => any) => void,
): T => {
    logger.info(socket.emit);
    const SocketON = socket.on.bind(socket);

    socket.on = (event: string, listener: (...args: any[]) => any): T => {
        SocketON(event, (...args: any[]) => {
            middlewareCallback(args.pop(), async () => {
                return new Promise(async (resolve, reject) => {
                    try {
                        await listener(...args, (data: any) => {
                            resolve(data);
                        });
                    } catch (err) {
                        reject(err);
                    }
                });
            });
        });
        return socket as any;
    };
    return socket as any;
};

export const throwError = (err: BaseError): SIO.ResponseData => {
    return {
        code: err.code,
        message: err.message,
    };
};

export const responseSuccess = <T = any>(data: T, message?: string): SIO.ResponseData<T> => {
    return {
        code: 0,
        data,
        message,
    };
};
