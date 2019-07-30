import * as express from 'express';
import * as http from 'http';
import './config/database';
import * as socketio from 'socket.io';
import logger from './logger';
import * as path from 'path';
import { config } from 'dotenv';
import { loadCompanyNamespace } from './services/NamespaceService';
import { createConnection, getConnection } from 'typeorm';
import routeApi from './routes/api';
import routeImg from './routes/img';
import { BaseError, ResponseCode } from './exceptions';
import { ValidationError } from './exceptions/validation.error';
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

app.use(express.json());
// app.use(methodOverride());
app.set('view options', { layout: false });

/** web */
const serviceRoot = path.join(__dirname, '../public/service');
const customerRoot = path.join(__dirname, '../public/customer');

app.get('/service', (req, res) => res.sendStatus(404));
app.use('/service/*', express.static(serviceRoot));
app.use('/service-assigns', express.static(serviceRoot));

app.get('/customer', (req, res) => res.sendStatus(404));
app.use('/customer/*', express.static(customerRoot));
app.use('/customer-assigns', express.static(customerRoot));

app.use('/api', routeApi);
app.use('/img', routeImg);

app.use((err: BaseError, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err instanceof ValidationError) {
        res.status(err.statusCode).send({
            code: err.code,
            message: err.message,
            errors: err.errors,
        });
        return;
    }

    res.status(err instanceof BaseError ? err.statusCode : 500).send({
        code: err.code,
        message: err.message,
        stack: (err.stack || '').split('\n'),
    });
    // next(err);
});
