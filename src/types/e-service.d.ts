declare namespace NodeJS {
    interface ProcessEnv {
        PORT: string;
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

    namespace Talks {
        interface Talk {
            id: number;
            name: string;
            ip: string;
            online: boolean;
            status: 'waiting' | 'start' | 'closed' | 'unprocessed';
            executive: UserInfo;
            disconnectedAt: number;
            startAt: number;
            closedAt: number;
            createdAt: number;
        }

        interface TalkDetail extends Talk {
            watchers: UserInfo[];
            messages: IES.Talks.Message[];
        }
        interface TalkForCustomer {
            id: number;
            name: string;
            online: boolean;
            executive: UserInfo;
            startAt: number;
            createdAt: number;
            messages: IES.Talks.Message[];
        }

        interface Message {
            id: number;
            talkId: number;
            fromType: 'system' | 'service' | 'customer';
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
            talkId: number;
            user: IES.UserInfo;
        }
        interface CenterLeave {
            talkId: number;
            userId: number;
        }
    }
    namespace ListenerData {
        namespace Message {
            interface Request {
                talkId: number;
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
        (event: 'talks/message', data: IES.Talks.Message): boolean;
        /** 主管加入 */
        (event: 'talks/join', data: EmitterData.CenterJoin): boolean;
        /** 主管離開 */
        (event: 'talks/leave', data: EmitterData.CenterLeave): boolean;
        /** 任務關閉 */
        (event: 'talks/close', data: { talkId: number }): boolean;
        /** 更新任務詳細內容 */
        (event: 'talks/talk-detail', data: IES.Talks.TalkDetail): boolean;
    }

    interface Listener<T = () => void, S = any> {
        (event: string | symbol, listener: (...args: any[]) => void): T;
        (event: 'connect', listener: ListenerHandle<S>): T;
        (event: 'disconnect'): T;

        /** 收到訊息 */
        (event: 'talks/send', listener: ListenerHandle<ListenerData.Message.Request, ListenerData.Message.Response>): T;
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

                interface Talk extends IES.Talks.Talk {
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
                    username?: string;
                    password?: string;
                    token?: string;
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
            // (event: 'login', data: ListenerData.Login.Response): boolean;

            (event: 'message/error', data: { message: string }): boolean;

            (event: 'talks/talks', data: EmitterData.Center.Talk[]): boolean;

            (event: 'talks/talk', data: EmitterData.Center.Talk): boolean;

            (event: 'talks/talk-lock', data: { talkId: number }): boolean;

            (event: 'talks/talk-unlock', data: { talkId: number }): boolean;

            /** guest 離線 / 斷線 */
            (event: 'talks/talk-offline', data: { talkId: number; disconnectedAt: number }): boolean;

            /** guest 上線 / 重新連線 */
            (event: 'talks/talk-online', data: { talkId: number }): boolean;

            /** 服務人員更新 / 斷線 / 上線 等... */
            (event: 'talks/talk-executive', data: { talkId: number; executive: EmitterData.UserInfo }): boolean;

            /** talk 完成 */
            (event: 'talks/talk-closed', data: { talkId: number; clostedAt: number }): boolean;

            /** 更新任務列表 */
            (event: 'talks/talk-queue', data: IES.Talks.Talk[]): boolean;

            /** 捨棄 talk (未開始 & 顧客離線且 session 過期) */
            (event: 'talks/talk-discard', data: { talkId: number }): boolean;

            /** 更新 watch talks */
            (event: 'talks/talk-watchers', data: number[]): boolean;

            /** 任務分派 */
            (
                event: 'talks/talk-start',
                data: {
                    talkId: number;
                    startAt: number;
                    status: 'waiting' | 'start' | 'closed' | 'unprocessed';
                    executive: IES.UserInfo;
                },
            ): boolean;

            /** 更新所有房間 */
            (event: 'talks/rooms', data: EmitterData.Center.Room[]): boolean;

            /** 更新單一房間 */
            (event: 'talks/room', data: EmitterData.Center.Room): boolean;

            /** 某專員轉為 ready */
            (event: 'talks/room-ready', data: { userId: number }): boolean;

            /** 某專員轉為 unready */
            (event: 'talks/room-unready', data: { userId: number }): boolean;
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

            (event: 'talks/talk-lock', listener: ISK.ListenerHandle<number>): T;
            (event: 'talks/talk-unlock', listener: ISK.ListenerHandle<number>): T;

            (
                event: 'talks/check-messages',
                listener: ISK.ListenerHandle<{ talkId: number; lastMessageId: number }, IES.Talks.Message[]>,
            ): T;

            /** 開始服務顧客 */
            (event: 'talks/talk-start', listener: ISK.ListenerHandle<{ talkId: number }>): T;

            /** 主管加入 talk */
            (event: 'talks/talk-join', listener: ISK.ListenerHandle<{ talkId: number }>): T;

            /** 主管離開 talk */
            (event: 'talks/talk-leave', listener: ISK.ListenerHandle<{ talkId: number }>): T;

            /** 查詢所有房間 */
            (event: 'talks/rooms', listener: ISK.ListenerHandle): T;

            /** 關閉對話 */
            (event: 'talks/talk-close', listener: ISK.ListenerHandle<{ talkId: number }>): boolean;

            /** 開啟 */
            (event: 'talks/room-ready'): T;

            /** 關閉 */
            (event: 'talks/room-unready'): T;
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
                    messages: IES.Talks.Message;
                    startAt: number;
                }
            }
        }

        namespace ResponseData {}

        interface Emitter extends ISK.Emitter {
            // (event: 'firm', data: { id: number; name: string }): boolean;
            (event: 'talks/start', data: EmitterData.Center.Start): boolean;

            (event: 'talks/talk', data: IES.Talks.TalkForCustomer): boolean;

            (event: 'talks/close'): boolean;

            (event: 'talks/waiting'): boolean;
        }

        interface Listener<T = any> extends ISK.Listener<T, Socket> {
            (event: 'talks/close', listener: void): T;
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
