import { Router } from 'express';
import { UserRepository } from '../../repository/UserRepository';
import { getConnection } from 'typeorm';
import logger from '../../logger';

const router = Router();

router.get('/login', async (req, res) => {
    const repository = getConnection().getCustomRepository(UserRepository);
    const user = await repository.findByUsername('ivan');
    logger.info(user);
    if (user) {
        res.send(user);
    } else {
        res.send('empty');
    }
});

export default router;
