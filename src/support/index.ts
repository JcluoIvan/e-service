import logger from '../logger';
import { BaseError } from '../exceptions';

export const socketEventMiddleware = <T extends SocketIO.Socket>(
    socket: SocketIO.Socket,
    middlewareCallback: (response: MySocket.Response.Handle, next: () => any) => void,
): T => {
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

export const throwError = (err: BaseError): MySocket.Response.Data => {
    return {
        code: err.code,
        message: err.message,
    };
};

export const responseSuccess = <T = any>(data: T, message?: string): MySocket.Response.Data<T> => {
    return {
        code: 0,
        data,
        message,
    };
};
