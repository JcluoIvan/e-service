import { Router, Request, Response } from 'express';
import ArticleController from '../controllers/ArticleController';
import logger from '../config/logger';
import { handlerController } from '../controllers/BaseController';
import UserController from '../controllers/UserController';
import TalkController from '../controllers/TalkController';
import OptionController from '../controllers/OptionController';
import PersonalController from '../controllers/PersonalController';
import StickerController from '../controllers/StickerController';
import ClearTalkRecordController from '../controllers/ClearTalkRecordController';
import ClearLoginRecordController from '../controllers/ClearLoginRecordController';
import DemoController from '../controllers/DemoController';

const router = Router();

const handlerDemo = handlerController(DemoController, false);
router.get('/demo', handlerDemo(async (ctrl) => await ctrl.index()));

const handleOption = handlerController(OptionController);
router.get('/option/users', handleOption(async (ctrl) => await ctrl.userOptions()));

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

router.post('/users/:id/password', handleUser(async (ctrl) => await ctrl.updatePassword()));
router.post('/users/:id/toggle', handleUser(async (ctrl) => await ctrl.toggleEnabled()));
router.get('/users/:id/log-login', handleUser(async (ctrl) => await ctrl.logLoginList()));
router.post('/users/:id/reset-login-errors', handleUser(async (ctrl) => await ctrl.resetLoginErrors()));

const handleTalk = handlerController(TalkController);
router.get('/talks', handleTalk(async (ctrl) => await ctrl.listTalks()));
router.get('/talks/:tid', handleTalk(async (ctrl) => await ctrl.findTalk()));
router.get('/talks/:tid/messages-after/:mid', handleTalk(async (ctrl) => await ctrl.listAfterMessages()));
router.get('/talks/:tid/messages-before/:mid', handleTalk(async (ctrl) => await ctrl.listBeforeMessages()));
router.post('/talks/:tid/messages/:mid/update', handleTalk(async (ctrl) => await ctrl.updateMessage()));
router.post('/talks/:tid/messages/:mid/delete', handleTalk(async (ctrl) => await ctrl.deleteMessage()));

const handlePersonal = handlerController(PersonalController);
router.get('/personal', handlePersonal(async (ctrl) => await ctrl.getData()));
router.post('/personal/update/name', handlePersonal(async (ctrl) => await ctrl.updateName()));
router.post('/personal/update/password', handlePersonal(async (ctrl) => await ctrl.updatePassword()));
router.post('/personal/update/profile', handlePersonal(async (ctrl) => await ctrl.updateProfile()));

const handleSticker = handlerController(StickerController);
router.get('/stickers', handleSticker(async (ctrl) => await ctrl.allSticker()));
router.post('/stickers/:sid/add', handleSticker(async (ctrl) => await ctrl.addSticker()));
router.post('/stickers/:sid/move', handleSticker(async (ctrl) => await ctrl.moveSticker()));
router.post('/stickers/:sid/delete', handleSticker(async (ctrl) => await ctrl.deleteSticker()));
router.post('/stickers/:sid/clone', handleSticker(async (ctrl) => await ctrl.cloneSticker()));

const handleTalkRecords = handlerController(ClearTalkRecordController);
router.get('/clear-record/talk-records', handleTalkRecords(async (ctrl) => await ctrl.all()));
router.post('/clear-record/talk-records/delete', handleTalkRecords(async (ctrl) => await ctrl.deleteRecords()));

const handleLoginRecords = handlerController(ClearLoginRecordController);
router.get('/clear-record/login-records', handleLoginRecords(async (ctrl) => await ctrl.all()));
router.post('/clear-record/login-records/delete', handleLoginRecords(async (ctrl) => await ctrl.deleteRecords()));

export default router;
