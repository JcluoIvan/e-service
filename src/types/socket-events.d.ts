declare namespace SIO {
    enum ResponseCode {
        Done = 0,
        Invalid = 400,
    }

    interface ResponseData<T = any> {
        code: ResponseCode;
        message?: string;
        invalids?: any;
        data?: T;
    }

    type ResponseHandle<T = any> = (res?: ResponseData<T>) => void;

    interface ListenerHandle<D = any, R = any> {}

    namespace User {
        namespace Response {
            interface LoginResponse {
                id: number;
                role: 'admin' | 'supervisor' | 'executive';
                name: string;
            }
        }

        interface Emitters {
            (event: string | symbol, ...args: any[]): boolean;

            (event: 'firm', data: { id: number; name: string }): boolean;
        }

        interface Listeners<T = any> {
            (event: string | symbol, listener: (...args: any[]) => void): T;
            (
                event: 'login',
                listener: (
                    data: { username: string; password: string },
                    response: (data: Response.LoginResponse) => void,
                ) => void,
            ): T;

            (event: 'customer/join', listener: (data: { id?: string; name: string }, response: () => void) => void): T;
        }

        interface Socket extends SocketIO.Socket {
            on: Listeners<this>;
            emit: Emitters;
        }

        interface NamespaceSocket extends SocketIO.Namespace {
            on: Listeners<this>;
            emit: Emitters;
        }
    }

    namespace Customer {
        namespace EmitterData {
            interface Message {
                content: string | Buffer;
                type: 'text/plain' | 'image/jpeg' | 'image/png';
                time: string;
            }
        }

        namespace Response {
            interface Send {
                content: string | Buffer;
                type: 'text/plain' | 'image/jpeg' | 'image/png';
            }
        }

        interface Emitters {
            (event: string | symbol, ...args: any[]): boolean;

            (event: 'firm', data: { id: number; name: string }): boolean;

            (event: 'message', data: EmitterData.Message): boolean;
        }

        interface Listeners<T = any> {
            (event: string | symbol, listener: (...args: any[]) => void): T;

            (event: 'send', listener: (data: Response.Send, response: (time: string) => void) => void): T;
        }

        interface Socket extends SocketIO.Socket {
            on: Listeners<this>;
            emit: Emitters;
        }

        interface NamespaceSocket extends SocketIO.Namespace {
            on: Listeners<this>;
            emit: Emitters;
        }
    }
}
