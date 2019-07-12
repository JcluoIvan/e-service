import * as express from 'express';
import * as http from 'http';
import './config/database';
import * as socketio from 'socket.io';
import webRouter from './routes/web';
import logger from './logger';
import publicController from './controllers/public.controller';

const app = express();
const server = http.createServer(app);
const io = socketio().listen(server);
server.listen(3000, () => {
    logger.info(`Server Start on 3000`);

    io.on('connect', (socket: SIO.GuestSocket) => {
        publicController(socket);
    });
});

app.use(webRouter);
