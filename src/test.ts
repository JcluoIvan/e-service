import * as jimp from 'jimp';
import * as path from 'path';
import logger from './config/logger';

(async () => {
    const img = await jimp.read('C:/works/e-service/upload-files/3ae31a7c0388e067df360f378b737b16.jpg');
    img.scaleToFit(240, 240).write(
        'C:/works/e-service/upload-files/3ae31a7c0388e067df360f378b737b16.min.jpg',
        (err) => {
            if (err) {
                logger.error(err);
                return;
            }
        },
    );
})();
