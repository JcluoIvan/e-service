import BaseController from './BaseController';
import { getConnection } from 'typeorm';
import { Sticker } from '../entity/Sticker';
import * as md5 from 'md5';
import * as fs from 'fs';
import * as path from 'path';
import { fileExists } from '../support/file';
import { StickerRepository } from '../repository/StickerRepository';
import { StatusCode } from '../exceptions';
import { FailedError } from '../exceptions/failed.error';
import { User } from '../entity/User';

const updateStickerOdr = async (user: User) => {
    await getConnection()
        .getCustomRepository(StickerRepository)
        .updateOdr(user.companyId, user.id);
};

export default class StickerController extends BaseController {
    public async allSticker() {
        const user = this.user;
        const uid = this.request.query.userId || user.id;
        const values = {
            cid: user.companyId,
            uid,
        };
        const query = getConnection()
            .createQueryBuilder(Sticker, 'sticker')
            .where('sticker.company_id = :cid AND sticker.user_id = :uid', values)
            .orderBy('sticker.odr', 'ASC');
        if (uid !== user.id) {
            query.leftJoinAndMapOne(
                'sticker.exists',
                'sticker',
                'self',
                `self.image = sticker.image AND self.user_id = ${user.id}`,
            );
        }
        const rows = await query.getMany();
        const stickers = rows.map((row) => {
            return {
                id: row.id,
                imageUrl: row.imageUrl,
                odr: row.odr,
                exists: row.exists ? true : false,
            };
        });
        this.response.send(stickers);
    }
    public async addSticker() {
        const user = this.user;
        const image: string = this.request.body.image;
        const [, ext = null] = image.match(/^data:image\/(png|jpeg|gif)/) || [];
        const imgTypes = ['jpeg', 'gif', 'png'];
        if (!image) {
            throw new Error('must be image');
        }
        if (!ext || imgTypes.indexOf(ext) < 0) {
            throw new Error(`image type must in [${imgTypes.join(',')}]`);
        }

        const fname = md5(image);
        const filename = `${fname}.${ext}`;
        const filepath = path.join(process.env.STICKER__UPLOAD_PATH, filename);

        const exists = await fileExists(filepath);
        if (!exists) {
            const base64Data = image.replace(/^data:image\/(png|jpeg|gif);base64,/, '');
            await new Promise((resolve, reject) => {
                fs.writeFile(filepath, base64Data, 'base64', (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        }
        const sticker = new Sticker();
        sticker.companyId = user.companyId;
        sticker.userId = user.id;
        sticker.image = filename;
        await sticker.save();
        await updateStickerOdr(user);
        this.response.sendStatus(StatusCode.NoContent);

        // do something
    }
    public async moveSticker() {
        const user = this.user;
        const sid = this.request.params.sid || 0;
        const values = {
            sid,
            cid: user.companyId,
            uid: user.id,
        };
        const odr = this.request.body.odr || 0;
        const sticker = await getConnection()
            .createQueryBuilder(Sticker, 'sticker')
            .where('id = :sid AND company_id = :cid AND user_id = :uid', values)
            .getOne();
        if (!sticker) {
            throw new FailedError('sticker not found');
        }

        await getConnection()
            .createQueryBuilder()
            .update(Sticker)
            .set({ odr })
            .where('id = :sid AND company_id = :cid AND user_id = :uid', values)
            .execute();

        await updateStickerOdr(user);
        await sticker.reload();
        this.response.send({ odr: sticker.odr });
        // do something
    }
    public async deleteSticker() {
        const user = this.user;
        const sid = this.request.params.sid || 0;
        const values = {
            sid,
            cid: user.companyId,
            uid: user.id,
        };
        const odr = this.request.body.odr || 0;

        const res = await getConnection()
            .createQueryBuilder()
            .delete()
            .from(Sticker)
            .where('id = :sid AND company_id = :cid AND user_id = :uid', values)
            .execute();
        if (!res.affected || res.affected === 0) {
            throw new FailedError(`not found or delete failed.`);
        }

        await updateStickerOdr(user);
        this.response.sendStatus(StatusCode.NoContent);
        // do something
    }
    public async cloneSticker() {
        const user = this.user;
        const sid = this.request.params.sid || 0;
        const values = { sid, cid: user.companyId };
        const sticker = await getConnection()
            .createQueryBuilder(Sticker, 'sticker')
            .where('id = :sid AND company_id = :cid', values)
            .getOne();

        if (!sticker) {
            throw new FailedError('sticker not found');
        }

        const clone = new Sticker();
        clone.companyId = user.companyId;
        clone.userId = user.id;
        clone.image = sticker.image;
        await clone.save();
        await updateStickerOdr(user);
        this.response.sendStatus(StatusCode.NoContent);

        // do something
    }
}
