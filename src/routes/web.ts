import * as express from 'express';
import * as path from 'path';
const webRouter = express.Router();
const WEB_ROOT = path.resolve(__dirname, '../../web');
webRouter.use('/assets', express.static(path.join(WEB_ROOT, 'assets')));
webRouter.get('/', (req, res) => {
    res.sendFile(path.join(WEB_ROOT, 'index.html'));
});

export default webRouter;
