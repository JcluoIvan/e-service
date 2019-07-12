import * as log4js from 'log4js';

log4js.configure({
    appenders: {
        out: {
            type: 'console',
        },
        app: { type: 'dateFile', filename: 'log' },
    },
    categories: {
        default: { appenders: ['out', 'app'], level: 'debug' },
    },
});

export default log4js.getLogger();
