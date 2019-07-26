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
        interface TaskForCustomer {
            id: number;
            name: string;
            online: boolean;
            executive: UserInfo;
            startAt: number;
            createdAt: number;
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
            interface UserInfo extends IES.UserInfo {
                online: boolean;
            }

            namespace Center {
                interface Room {
                    id: number;
                    name: string;
                    ready: boolean;
                    online: boolean;
                }

                interface Task extends IES.TaskCenter.Task {
                    executive: UserInfo;
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
                    companyId: number;
                    name: string;
                    imageUrl: string;
                    role: 'admin' | 'supervisor' | 'executive';
                    token: string;
                    loginAt: string;
                }
            }

            namespace Article {

                interface Save {
                    id: number;
                    key: string;
                    content: string;
                    share: boolean;
                }
            }
        }

        interface Emitter extends ISK.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            /** 重新連線 */
            (event: 'login', data: ListenerData.Login.Response): boolean;

            (event: 'message/error', data: { message: string }): boolean;

            (event: 'center/tasks', data: EmitterData.Center.Task[]): boolean;

            (event: 'center/task', data: EmitterData.Center.Task): boolean;

            (event: 'center/task-lock', data: { taskId: number }): boolean;

            (event: 'center/task-unlock', data: { taskId: number }): boolean;

            /** guest 離線 / 斷線 */
            (event: 'center/task-offline', data: { taskId: number; disconnectedAt: number }): boolean;

            /** guest 上線 / 重新連線 */
            (event: 'center/task-online', data: { taskId: number }): boolean;

            /** 服務人員更新 / 斷線 / 上線 等... */
            (event: 'center/task-executive', data: { taskId: number; executive: EmitterData.UserInfo }): boolean;

            /** task 完成 */
            (event: 'center/task-closed', data: { taskId: number; clostedAt: number }): boolean;

            /** 更新任務列表 */
            (event: 'center/task-queue', data: IES.TaskCenter.Task[]): boolean;

            /** 捨棄 task (未開始 & 顧客離線且 session 過期) */
            (event: 'center/task-discard', data: { taskId: number }): boolean;

            /** 更新 watch tasks */
            (event: 'center/task-watchers', data: number[]): boolean;

            /** 任務分派 */
            (
                event: 'center/task-start',
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
        }

        /** articles emitters */
        interface Emitter extends ISK.Emitter {
            (event: 'article/all', articles: EmitterData.Support.Article[]): boolean;
            (event: 'article/one', article: EmitterData.Support.Article[]): boolean;
            (event: 'article/remove', data: number): boolean;
        }

        interface Listener<T = any> extends ISK.Listener<T, Socket> {
            (event: 'login', listener: ISK.ListenerHandle<ListenerData.Login.Request, ListenerData.Login.Response>): T;

            // (event: 'customer/join', listener: (data: { id?: string; name: string }, response: () => void) => void): T;

            (event: 'center/task-lock', listener: ISK.ListenerHandle<number>): T;
            (event: 'center/task-unlock', listener: ISK.ListenerHandle<number>): T;

            /** 開始服務顧客 */
            (event: 'center/task-start', listener: ISK.ListenerHandle<{ taskId: number }>): T;

            /** 主管加入 task */
            (event: 'center/task-join', listener: ISK.ListenerHandle<{ taskId: number }>): T;

            /** 主管離開 task */
            (event: 'center/task-leave', listener: ISK.ListenerHandle<{ taskId: number }>): T;

            /** 查詢所有房間 */
            (event: 'center/rooms', listener: ISK.ListenerHandle): T;

            /** 開啟 */
            (event: 'center/room-ready'): T;

            /** 關閉 */
            (event: 'center/room-unready'): T;
        }
        interface Listener<T = any> extends ISK.Listener<T, Socket> {
            (event: 'article/save', listener: ISK.ListenerHandle<ListenerData.Article.Save>): T;
            (event: 'article/remove', listener: ISK.ListenerHandle<number>): T;
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
                    messages: IES.TaskCenter.Message;
                    startAt: number;
                }
            }
        }

        namespace ResponseData {}

        interface Emitter extends ISK.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            (event: 'center/start', data: EmitterData.Center.Start): boolean;

            (event: 'center/task', data: IES.TaskCenter.TaskForCustomer): boolean;

            (event: 'center/close'): boolean;

            (event: 'center/waiting'): boolean;
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
