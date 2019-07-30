import * as fs from 'fs';
export const fileExists = async (fpath: string): Promise<boolean> => {
    return new Promise((resolve) => fs.exists(fpath, (exists) => resolve(exists)));
};
