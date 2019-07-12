import * as express from 'express';
import * as UserController from 'src/controllers/user.controller';
import publicRouter from '../controllers/api/public.controller';
import logger from '../logger';
const apiRouter = express.Router();

/* public api */
apiRouter.use(publicRouter);


export default apiRouter;
