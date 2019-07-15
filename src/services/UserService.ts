import { User } from '../entity/User';
import { getConnection } from 'typeorm';
import { LoginFailedError } from '../exceptions/login.errors';
import * as moment from 'moment';

export interface UserItem {
    user: User;
    socket: SIO.User.Socket;
}

export default class UserService {
    private users = new Map<number, UserItem>();

    public async login(socket: SIO.User.Socket, data: { firmId: number; username: string; password: string }) {
        const user = await getConnection()
            .getRepository(User)
            .createQueryBuilder('user')
            .where('username = :username', { username: data.username })
            .where('firm_id = :fid', { fid: data.firmId })
            .leftJoinAndSelect('user.firm', 'firm')
            .getOne();

        if (!user) {
            throw new LoginFailedError();
        }

        if (!user.checkPassword(data.password)) {
            throw new LoginFailedError();
        }

        const existsUser = this.users.get(user.id);

        if (existsUser) {
            existsUser.socket.disconnect();
        }

        const userItem = {
            user,
            socket,
        };

        this.users.set(user.id, userItem);

        return userItem;
    }
}
