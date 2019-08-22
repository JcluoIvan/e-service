import BaseController from './BaseController';
import * as fs from 'fs';
import * as path from 'path';
import * as md5 from 'md5';
import { fileExists } from '../support/file';
import { getConnection } from 'typeorm';
import { User } from '../entity/User';
import { UserRepository } from '../repository/UserRepository';
import { UserNotFoundError } from '../exceptions/login.errors';
import { StatusCode } from '../exceptions';

export default class PersonalController extends BaseController {
    public async getData() {
        await this.user.reload();

        this.response.send({
            name: this.user.name,
            imageUrl: this.user.imageUrl,
        });
    }

    public async updateProfile() {
        const profile: string = this.request.body.profile;

        if (!profile) {
            throw new Error('must be image');
        }

        const fname = md5(profile);
        const filename = `${fname}.jpg`;
        const filepath = path.join(process.env.USER__IMAGE_UPLOAD_PATH, filename);

        const user = await getConnection()
            .getCustomRepository(UserRepository)
            .findUser(this.user.id, this.user.companyId);
        if (!user) {
            throw new UserNotFoundError();
        }

        const exists = await fileExists(filepath);
        if (!exists) {
            const base64Data = profile.replace(/^data:image\/(png|jpeg);base64,/, '');
            await new Promise((resolve, reject) => {
                fs.writeFile(filepath, base64Data, 'base64', async (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve();
                });
            });
        }
        user.image = filename;
        await user.save();
        this.user.reload();
        this.response.sendStatus(StatusCode.NoContent);
    }
}
