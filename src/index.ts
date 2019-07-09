import { ExpressPeerServer } from 'peer';
import * as express from 'express';
import * as path from 'path';
import * as fs from 'fs';

const WEB_ROOT = path.resolve(__dirname, '../web');

const app = express();

const server = app.listen(3000);

const peerserver = ExpressPeerServer(server);

app.use('/peer', peerserver);
app.use('/assets', express.static(path.join(WEB_ROOT, 'assets')));
app.get('/', (req, res) => {
    res.sendFile(path.join(WEB_ROOT, 'index.html'));
});

peerserver.on('connection', (id) => {
    console.info('connected > ', id);
});


peerserver.on('disconnect', (id) => {
    console.info('disconnected > ', id);
});
