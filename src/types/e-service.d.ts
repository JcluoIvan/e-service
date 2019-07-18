declare namespace NodeJS {
    interface ProcessEnv {
        IMAGE_UPLOAD_PATH: string;
        IMAGE_URI: string;
    }
}

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

    type ListenerHandle<D = any, R = any> = (data: D, response: Response.Handle<R>) => void;

    namespace EmitterData {
        interface Message {
            id: number;
            taskId: number;
            content: string;
            type: 'text' | 'image';
            time: string;
        }
        interface CenterJoin {
            taskId: number;
            user: {
                id: number;
                name: string;
            };
        }
        interface CenterLeave {
            taskId: number;
            userId: number;
        }
    }
    namespace ListenerData {
        namespace Message {
            interface Request {
                taskId: number;
                content: string;
                type: 'text/plain' | 'image/jpeg' | 'image/png';
            }
            interface Response {
                id: number;
                time: string;
            }
        }
    }

    interface Emitter {
        (event: string | symbol, ...args: any[]): boolean;
        (event: 'disconnect'): boolean;
        /** 發送訊息 */
        (event: 'center/send', data: EmitterData.Message): boolean;
        /** 主管加入 */
        (event: 'center/join', data: EmitterData.CenterJoin): boolean;
        /** 主管離開 */
        (event: 'center/leave', data: EmitterData.CenterLeave): boolean;
        /** 任務關閉 */
        (event: 'center/close', data: { taskId: number }): boolean;
    }

    interface Listener<T = () => void, S = any> {
        (event: string | symbol, listener: (...args: any[]) => void): T;
        (event: 'connect', listener: ListenerHandle<S>): T;
        (event: 'disconnect'): T;

        /** 收到訊息 */
        (
            event: 'center/send',
            listener: ListenerHandle<ListenerData.Message.Request, ListenerData.Message.Response>,
        ): T;
    }
}

declare namespace IUser {
    namespace Socket {
        namespace EmitterData {
            namespace Center {
                interface Task {
                    id: number;
                    customer: {
                        id: string;
                        name: string;
                    };
                    createdAt: string;
                }

                interface TaskDetail extends Task {
                    watchers: {
                        id: number;
                        name: string;
                    }[];
                    executive: {
                        id: number;
                        name: string;
                    };
                    startAt: string;
                    message: MySocket.EmitterData.Message[];
                }

                interface Room {
                    id: number;
                    ready: boolean;
                    user: { id: number; name: string };
                    tasks: Task[];
                }
            }
        }

        namespace ListenerData {
            namespace Login {
                interface Request {
                    username: string;
                    password: string;
                }
                interface Response {
                    id: number;
                    role: 'admin' | 'supervisor' | 'executive';
                    name: string;
                }
            }
        }

        interface Emitter extends MySocket.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            (event: 'center/task-lock', data: { taskId: number }): boolean;

            (event: 'center/task-unlock', data: { taskId: number }): boolean;

            /** 更新任務列表 */
            (event: 'center/task-queue', data: EmitterData.Center.Task[]): boolean;

            /** 任務分派 */
            (event: 'center/despatch-task', data: { taskId: number; roomId: number }): boolean;

            /** 更新所有房間 */
            (event: 'center/rooms', data: EmitterData.Center.Room[]): boolean;

            /** 更新單一房間 */
            (event: 'center/room', data: EmitterData.Center.Room): boolean;

            /** 更新任務詳細內容 */
            (event: 'center/task-detail', data: EmitterData.Center.TaskDetail): boolean;
        }

        interface Listener<T = any> extends MySocket.Listener<T, Socket> {
            (
                event: 'login',
                listener: MySocket.ListenerHandle<ListenerData.Login.Request, ListenerData.Login.Response>,
            ): T;

            // (event: 'customer/join', listener: (data: { id?: string; name: string }, response: () => void) => void): T;

            (event: 'center/task-lock', listener: MySocket.ListenerHandle<number>): T;
            (event: 'center/task-unlock', listener: MySocket.ListenerHandle<number>): T;

            /** 主管加入 task */
            (event: 'center/join', listener: MySocket.ListenerHandle<number>): T;

            /** 主管離開 task */
            (event: 'center/leave', listener: MySocket.ListenerHandle<number>): T;

            /** 查詢所有房間 */
            (event: 'center/rooms', listener: MySocket.ListenerHandle): T;

            /** 開啟 */
            (event: 'center/room-ready', listener: MySocket.ListenerHandle): T;

            /** 關閉 */
            (event: 'center/room-unready', listener: MySocket.ListenerHandle): T;
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
            (event: 'center/start'): boolean;
        }

        interface Listener<T = any> extends MySocket.Listener<T, Socket> {
            (event: 'center/close', listener: void): T;
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
