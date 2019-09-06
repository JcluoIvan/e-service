import { EntityRepository, getConnection } from 'typeorm';
import BaseRepository from './BaseRepository';
import { Sticker } from '../entity/Sticker';

@EntityRepository(Sticker)
export class StickerRepository extends BaseRepository<Sticker> {
    public async updateOdr(companyId: number, userId: number) {
        await getConnection().query('set @odr := 0');
        await getConnection().query(
            `UPDATE sticker SET odr = (@odr := @odr + 10) WHERE company_id = ? AND user_id = ? ORDER BY odr`,
            [companyId, userId],
        );
    }
}
