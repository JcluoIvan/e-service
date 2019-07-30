import { Router, Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { ResourceNotFoundError } from '../exceptions/router.errors';
import { fileExists } from '../support/file';
import { handlerClosure } from '../controllers/BaseController';

const router = Router();

router.get(
    '*',
    handlerClosure(async (req, res) => {
        const imgPath = path.join(process.env.MESSAGE__IMAGE_UPLOAD_PATH, req.path);
        const exists = await fileExists(imgPath);
        if (!exists) {
            throw new ResourceNotFoundError();
        }

        res.sendFile(imgPath);
    }),
);

export default router;
