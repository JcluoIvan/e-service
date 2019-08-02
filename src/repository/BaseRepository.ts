import { Repository, SelectQueryBuilder } from 'typeorm';
import logger from '../config/logger';

export interface PaginateData<T> {
    rows: T[];
    total: number;
    size: number;
    page: number;
}

export default class BaseRepository<T> extends Repository<T> {
    public async paginate(
        query: { page: number; size: number; sorts?: string[] },
        cb: (query: SelectQueryBuilder<T>) => void,
    ): Promise<PaginateData<T>> {
        const page = Math.max(1, Number(query.page) || 1);
        const size = Number(query.size) || 20;
        const queryBuilder = this.createQueryBuilder();
        if (query.sorts) {
            query.sorts.forEach((str) => {
                const [key, by = 'ASC'] = str.split(',');
                queryBuilder.orderBy(key, by.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
            });
        }
        cb(queryBuilder);
        const total = await queryBuilder.getCount();
        logger.warn(`offset = ${(page - 1) * size}`);
        const rows = await queryBuilder
            .skip((page - 1) * size)
            .take(size)
            .getMany();

        return {
            page,
            size,
            total,
            rows,
        };
    }
}
