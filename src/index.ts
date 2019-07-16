import * as express from 'express';
import * as http from 'http';
import './config/database';
import * as socketio from 'socket.io';
import logger from './logger';
import { socketEventMiddleware, responseSuccess, throwError } from './support';
import UserService from './services/UserService';
import ExecutiveService from './services/ExecutiveService';
import * as path from 'path';
import CustomerService from './services/CustomerService';
import CenterService from './services/CenterService';

const app = express();
const server = http.createServer(app);
const io = socketio().listen(server);

server.listen(3000, () => {
    logger.info(`Server Start on 3000`);

    const nspUser: IUser.Socket.Namespace = io.of('/user') as any;
    const nspCustomer: ICustomer.Socket.Namespace = io.of('/customer') as any;

    const userService = new UserService(nspUser);
    const customerService = new CustomerService(nspCustomer);

    const executiveService = new ExecutiveService(userService);
    const centerService = new CenterService(userService, customerService);

});

const publicRoot = path.join(__dirname, '../public');
app.set('view options', { layout: false });
app.use(express.static(publicRoot));
