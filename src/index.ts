import * as express from 'express';
import * as http from 'http';
import './config/database';
import * as socketio from 'socket.io';
import logger from './logger';
import * as path from 'path';
import { config } from 'dotenv';
import { loadCompanyNamespace } from './services/NamespaceService';
import { createConnection } from 'typeorm';

config();

logger.info('msg = ', process.env.MESSAGE);

const app = express();
const server = http.createServer(app);
const io = socketio().listen(server);

server.listen(3000, async () => {
    const connection = await createConnection();

    logger.info(`Server Start on 3000`);

    io.use((socket, next) => {
        next();
        logger.info(`nsp name = ${socket.nsp.name}`);
        logger.info(`nsps = ${Object.keys(io.nsps)}`);
    });

    loadCompanyNamespace(io);

    // const userService = new UserService(nspUser);
    // const customerService = new CustomerService(nspCustomer);

    // const executiveService = new ExecutiveService(userService);
    // const centerService = new CenterService(userService, customerService);
});

const publicRoot = path.join(__dirname, '../public');
app.set('view options', { layout: false });
app.use(express.static(publicRoot));
