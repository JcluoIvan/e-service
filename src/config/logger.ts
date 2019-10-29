import * as log4js from 'log4js';
import * as path from 'path';

log4js.configure({
    appenders: {
        out: {
            type: 'console',
        },
        app: { type: 'dateFile', filename: path.join(__dirname, '../logs/log') },
    },
    categories: {
        default: { appenders: ['out', 'app'], level: 'error' },
    },
});

export default log4js.getLogger();
