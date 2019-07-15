import * as express from 'express';
import * as http from 'http';
import './config/database';
import * as socketio from 'socket.io';
import logger from './logger';
import { socketEventMiddleware, responseSuccess, throwError } from './support';
import { Firm } from './entity/Firm';
import UserService from './services/UserService';
import PublicService from './services/PublicService';
import ExecutiveService from './services/ExecutiveService';

const app = express();
const server = http.createServer(app);
const io = socketio().listen(server);

app.get('/', (req, res) => {



});


server.listen(3000, () => {
    logger.info(`Server Start on 3000`);

    const userService = new UserService();
    const publicService = new PublicService();
    const executiveService = new ExecutiveService(userService);

    /* middleware - handle error exception */
    io.of('user').on('connect', async (originSocket: SIO.User.Socket) => {
        const { namespace = null } = originSocket.handshake.query || {};

        logger.info(`has connection, namespace = ${namespace}`);

        const socket: SIO.User.Socket = socketEventMiddleware<SIO.User.Socket>(originSocket, async (response, next) => {
            try {
                response(responseSuccess(await next()));
            } catch (err) {
                logger.error(`Error: ${err.message}`);
                response(throwError(err));
            }
        });

        let firm!: Firm;
        try {
            firm = await publicService.onConnect(socket, namespace);
        } catch (err) {
            // has error
            logger.error(`Err: ${err.message}`);
            socket.disconnect();
            return;
        }

        socket.on('login', async ({ username, password }, res) => {
            /* 登入 */
            const userItem = await userService.login(socket, { firmId: firm.id, username, password });
            res({
                id: userItem.user.id,
                name: userItem.user.name,
                role: userItem.user.role,
            });

            /* 登入成功後 */
            executiveService.onConnected(userItem);
        });
    });

    io.of('customer').on('connect', async (originSocket: SIO.Customer.Socket) => {});
});
