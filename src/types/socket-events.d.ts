declare namespace SIO {
    enum ResponseCode {
        Done = 0,
        Invalid = 400,
    }

    interface Response<T = any> {
        code: ResponseCode;
        message?: string;
        invalids?: any;
        data?: T;
    }

    type ResponseHandle<T = any> = (res?: Response<T>) => void;

    interface ListenerHandle<D = any, R = any> {}

    namespace Guest {
        interface Emitters {
            (event: string | symbol, ...args: any[]): boolean;
        }

        namespace Listener {}
        interface Listeners<T> {
            (event: string, listener: Function): T;
            (
                event: 'login',
                listener: (data: { username: string; password: string }, response: ResponseHandle) => void,
            ): T;
        }
    }

    interface GuestSocket extends SocketIO.Socket {
        on: Guest.Listeners<this>;
        emit: Guest.Emitters;
    }
}
