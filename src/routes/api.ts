import { Router, Request, Response } from 'express';
import ArticleController from '../controllers/ArticleController';
import logger from '../logger';
import { handlerController } from '../controllers/BaseController';
import UserController from '../controllers/UserController';

const router = Router();

const handleArticle = handlerController(ArticleController);

/** find all articles */
router.get('/articles', handleArticle(async (ctrl) => await ctrl.allArticle()));

/** find article */
router.get('/articles/:id', handleArticle(async (ctrl) => await ctrl.findAtricle()));

router.post('/articles/:id/save', handleArticle(async (ctrl) => await ctrl.saveArticle()));

router.post('/articles/:id/delete', handleArticle(async (ctrl) => ctrl.deleteArticle()));

const handleUser = handlerController(UserController);

router.get('/users', handleUser(async (ctrl) => await ctrl.listUser()));

router.get('/users/:id', handleUser(async (ctrl) => await ctrl.findUser()));

router.post('/users/:id/save', handleUser(async (ctrl) => await ctrl.saveUser()));

export default router;
