import * as express from 'express';
import './config/database';
import webRouter from './routes/web';

const app = express();

const server = app.listen(3000, () => {
    // logger
});

app.use(webRouter);

// console.info(require.main.filename);
