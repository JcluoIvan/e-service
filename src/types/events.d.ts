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
    interface Message {
        content: string | Buffer;
        type: 'text/plain' | 'image/jpeg' | 'image/png';
        time: number;
    }

    interface Emitter {
        (event: string | symbol, ...args: any[]): boolean;
        (event: 'disconnect'): boolean;
        (event: 'send', data: Message): boolean;
    }

    interface Listener<T = () => void, S = any> {
        (event: string | symbol, listener: (...args: any[]) => void): T;
        (event: 'connect', listener: (socket: S) => void): T;
        (event: 'send', listener: (data: Message, response: (time: number) => void) => void): T;
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
                    response: MySocket.Response.Handle<ResponseData.Login>,
                ) => void,
            ): T;

            // (event: 'customer/join', listener: (data: { id?: string; name: string }, response: () => void) => void): T;

            (event: 'center/task-lock', listener: (taskId: number, response: (res: boolean) => void) => void): T;
            (event: 'center/task-unlock', listener: MySocket.Response.Handle): T;
        }

        interface Emitter extends MySocket.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            (event: 'center/task-lock', data: { taskId: number }): boolean;
            (event: 'center/task-unlock', data: { taskId: number }): boolean;
            (event: 'center/despatch-task', data: { taskId: number; roomId: number }): boolean;
        }

        interface Socket extends SocketIO.Socket {
            on: Listener<this>;
            emit: Emitter;
            nsp: Namespace;
        }

        interface Namespace extends SocketIO.Namespace {
            on: Listener<this>;
            emit: Emitter;
        }
    }

}
declare namespace ICustomer {
    namespace Socket {
        namespace EmitterData {
            interface Message {}
        }

        namespace ResponseData {}

        interface Emitter extends MySocket.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            (event: 'center/join-room'): boolean;
        }

        interface Listener<T = any> extends MySocket.Listener<T, Socket> {
            (event: 'close', listener: void): T;
        }
        interface Socket extends SocketIO.Socket {
            on: Listener<this>;
            emit: Emitter;
            nsp: Namespace;
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
