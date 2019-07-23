declare namespace NodeJS {
    interface ProcessEnv {
        MESSAGE__IMAGE_UPLOAD_PATH: string;
        MESSAGE__IMAGE_URL: string;
        USER__IMAGE_UPLOAD_PATH: string;
        USER__IMAGE_URL: string;
    }
}

declare namespace IES {
    interface UserInfo {
        id: number;
        name: string;
        imageUrl: string;
    }

    namespace TaskCenter {
        interface Task {
            id: number;
            name: string;
            online: boolean;
            executive: UserInfo;
            disconnectedAt: number;
            startAt: number;
            closedAt: number;
            createdAt: number;
        }

        interface TaskDetail extends Task {
            watchers: UserInfo[];
            messages: IES.TaskCenter.Message[];
        }
        interface Message {
            id: number;
            taskId: number;
            user: IES.UserInfo;
            content: string;
            type: 'text' | 'image';
            time: number;
        }
    }
}

declare namespace ISK {
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
        interface CenterJoin {
            taskId: number;
            user: IES.UserInfo;
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
                content: string;
                time: number;
            }
        }
    }

    interface Emitter {
        (event: string | symbol, ...args: any[]): boolean;
        (event: 'disconnect'): boolean;
        (event: 'token', data: { token: string }): boolean;
        /** 發送訊息 */
        (event: 'center/message', data: IES.TaskCenter.Message): boolean;
        /** 主管加入 */
        (event: 'center/join', data: EmitterData.CenterJoin): boolean;
        /** 主管離開 */
        (event: 'center/leave', data: EmitterData.CenterLeave): boolean;
        /** 任務關閉 */
        (event: 'center/close', data: { taskId: number }): boolean;
        /** 更新任務詳細內容 */
        (event: 'center/task-detail', data: IES.TaskCenter.TaskDetail): boolean;
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
                interface Room {
                    id: number;
                    name: string;
                    ready: boolean;
                    online: boolean;
                }
            }

            namespace Support {
                interface Article {
                    id: number;
                    key: string;
                    content: string;
                    share: boolean;
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
                    username: string;
                    name: string;
                    imageUrl: string;
                    role: 'admin' | 'supervisor' | 'executive';
                    token: string;
                    loginAt: string;
                }
            }
        }

        interface Emitter extends ISK.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            /** 重新連線 */
            (event: 'login', data: ListenerData.Login.Response): boolean;

            (event: 'message/error', data: { message: string }): boolean;

            (event: 'center/tasks', data: IES.TaskCenter.Task[]): boolean;

            (event: 'center/task', data: IES.TaskCenter.Task): boolean;

            (event: 'center/task-lock', data: { taskId: number }): boolean;

            (event: 'center/task-unlock', data: { taskId: number }): boolean;

            /** 顧客斷線(未完成) */
            (event: 'center/task-disconnected', data: { taskId: number }): boolean;

            /** 顧客重新連線 */
            (event: 'center/task-reconnected', data: { taskId: number }): boolean;

            /** task 完成 */
            (event: 'center/task-closed', data: { taskId: number }): boolean;

            /** 更新任務列表 */
            (event: 'center/task-queue', data: IES.TaskCenter.Task[]): boolean;

            /** 任務分派 */
            (
                event: 'center/task-despatch',
                data: {
                    taskId: number;
                    executive: IES.UserInfo;
                },
            ): boolean;

            /** 更新所有房間 */
            (event: 'center/rooms', data: EmitterData.Center.Room[]): boolean;

            /** 更新單一房間 */
            (event: 'center/room', data: EmitterData.Center.Room): boolean;

            /** 某專員轉為 ready */
            (event: 'center/room-ready', data: { userId: number }): boolean;

            /** 某專員轉為 unready */
            (event: 'center/room-unready', data: { userId: number }): boolean;

            (event: 'support/articles', articles: EmitterData.Support.Article[]): boolean;
        }

        interface Listener<T = any> extends ISK.Listener<T, Socket> {
            (event: 'login', listener: ISK.ListenerHandle<ListenerData.Login.Request, ListenerData.Login.Response>): T;

            // (event: 'customer/join', listener: (data: { id?: string; name: string }, response: () => void) => void): T;

            (event: 'center/task-lock', listener: ISK.ListenerHandle<number>): T;
            (event: 'center/task-unlock', listener: ISK.ListenerHandle<number>): T;

            /** 主管加入 task */
            (event: 'center/join', listener: ISK.ListenerHandle<number>): T;

            /** 主管離開 task */
            (event: 'center/leave', listener: ISK.ListenerHandle<number>): T;

            /** 查詢所有房間 */
            (event: 'center/rooms', listener: ISK.ListenerHandle): T;

            /** 開啟 */
            (event: 'center/room-ready'): T;

            /** 關閉 */
            (event: 'center/room-unready'): T;

            /** 開始服務顧客 */
            (event: 'center/task-start', listener: ISK.ListenerHandle<{ taskId: number }>): T;
        }

        interface Namespace extends SocketIO.Namespace {
            on: Listener<this>;
            emit: Emitter;
        }
    }

    interface Socket extends SocketIO.Socket {
        on: Socket.Listener<this>;
        emit: Socket.Emitter;
        nsp: Socket.Namespace;
    }
}
declare namespace ICustomer {
    namespace Socket {
        namespace EmitterData {
            namespace Center {
                interface Start {
                    executive: IES.UserInfo;
                    watchers: IES.UserInfo;
                }
            }
        }

        namespace ResponseData {}

        interface Emitter extends ISK.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            (
                event: 'center/start',
                data: { executive: IES.UserInfo; messages: IES.TaskCenter.Message; startAt: number },
            ): boolean;
            (event: 'center/close'): boolean;
        }

        interface Listener<T = any> extends ISK.Listener<T, Socket> {
            (event: 'center/close', listener: void): T;
        }
        interface Namespace extends SocketIO.Namespace {
            on: Listener<this>;
            emit: Emitter;
        }
    }

    interface Socket extends SocketIO.Socket {
        on: Socket.Listener<this>;
        emit: Socket.Emitter;
        nsp: Socket.Namespace;
    }

    namespace CustomerServiceEvents {
        interface Listener<T = any> {
            (event: string | symbol, listener: (...args: any[]) => void): T;
            (event: 'connect', listener: (data: { socket: Socket; token: string }) => void): T;
        }
    }
}
