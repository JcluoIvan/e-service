import { Router, Request, Response } from 'express';
import ArticleController from '../controllers/ArticleController';
import logger from '../config/logger';
import { handlerController } from '../controllers/BaseController';
import UserController from '../controllers/UserController';
import TalkController from '../controllers/TalkController';

const router = Router();

const handleArticle = handlerController(ArticleController);

/** find all articles */
router.get('/articles', handleArticle(async (ctrl) => await ctrl.allArticle()));

/** find article */
router.get('/articles/:id', handleArticle(async (ctrl) => await ctrl.findAtricle()));

router.post('/articles/:id/save', handleArticle(async (ctrl) => await ctrl.saveArticle()));

// router.post('/articles/:id/update-auto-send', handleArticle(async (ctrl) => await ctrl.updateAutoSend()));

router.post('/articles/:id/move', handleArticle(async (ctrl) => await ctrl.moveArticle()));

router.post('/articles/:id/delete', handleArticle(async (ctrl) => ctrl.deleteArticle()));

const handleUser = handlerController(UserController);

router.get('/users', handleUser(async (ctrl) => await ctrl.listUser()));

router.get('/users/:id', handleUser(async (ctrl) => await ctrl.findUser()));

router.post('/users/:id/save', handleUser(async (ctrl) => await ctrl.saveUser()));

const handleTalk = handlerController(TalkController);
router.get('/talks', handleTalk(async (ctrl) => await ctrl.listTalks()));
router.get('/talks/:tid', handleTalk(async (ctrl) => await ctrl.findTalk()));
router.get('/talks/:tid/messages-after/:mid', handleTalk(async (ctrl) => await ctrl.listAfterMessages()));
router.get('/talks/:tid/messages-before/:mid', handleTalk(async (ctrl) => await ctrl.listBeforeMessages()));
router.post('/talks/:tid/messages/:mid/update', handleTalk(async (ctrl) => await ctrl.updateMessage()));
router.post('/talks/:tid/messages/:mid/delete', handleTalk(async (ctrl) => await ctrl.deleteMessage()));

export default router;
