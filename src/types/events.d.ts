declare namespace MySocket {
    namespace Response {
        interface Data<T = any> {
            code: number;
            message?: string;
            invalids?: any;
            data?: T;
        }

        type Handle<T = any> = (res?: Data<T>) => void;
    }

    interface Emitter {
        (event: string | symbol, ...args: any[]): boolean;
        (event: 'disconnect'): boolean;
    }

    interface Listener<T = any, S = any> {
        (event: string | symbol, listener: (...args: any[]) => void): T;
        (event: 'connect', listener: (socket: S) => void): T;
        (event: 'disconnect'): T;
    }
}

declare namespace IUser {
    namespace Socket {
        namespace ResponseData {
            interface Login {
                id: number;
                role: 'admin' | 'supervisor' | 'executive';
                name: string;
            }
        }

        interface Listener<T = any> extends MySocket.Listener<T, Socket> {
            (
                event: 'login',
                listener: (
                    data: { username: string; password: string },
                    response: (data: ResponseData.Login) => void,
                ) => void,
            ): T;

            (event: 'customer/join', listener: (data: { id?: string; name: string }, response: () => void) => void): T;
        }

        interface Emitter extends MySocket.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
        }

        interface Socket extends SocketIO.Socket {
            on: Listener<this>;
            emit: Emitter;
        }

        interface Namespace extends SocketIO.Namespace {
            on: Listener<this>;
            emit: Emitter;
        }
    }

    namespace UserServiceEvents {
        interface Listener<T = any> {
            (event: string | symbol, listener: (...args: any[]) => void): T;
            (event: 'login', listener: (data: { socket: Socket.Socket; id: number }) => void): T;
        }
    }
}
declare namespace ICustomer {
    namespace Socket {
        namespace EmitterData {
            interface Message {
                content: string | Buffer;
                type: 'text/plain' | 'image/jpeg' | 'image/png';
                time: string;
            }
        }

        namespace ResponseData {
            interface Send {
                content: string | Buffer;
                type: 'text/plain' | 'image/jpeg' | 'image/png';
            }
        }

        interface Emitter extends MySocket.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            (event: 'message', data: EmitterData.Message): boolean;
        }

        interface Listener<T = any> extends MySocket.Listener<T, Socket> {
            (event: 'send', listener: (data: ResponseData.Send, response: (time: string) => void) => void): T;
            (event: 'close', listener: void): T;
        }
        interface Socket extends SocketIO.Socket {
            on: Listener<this>;
            emit: Emitter;
        }

        interface Namespace extends SocketIO.Namespace {
            on: Listener<this>;
            emit: Emitter;
        }
    }

    namespace CustomerServiceEvents {
        interface Listener<T = any> {
            (event: string | symbol, listener: (...args: any[]) => void): T;
            (event: 'connect', listener: (data: { socket: Socket.Socket; token: string }) => void): T;
        }
    }
}
