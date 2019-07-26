import { Repository, SelectQueryBuilder } from 'typeorm';

export interface PaginateData<T> {
    rows: T[];
    total: number;
    size: number;
    page: number;
}

export default class BaseRepository<T> extends Repository<T> {
    public async paginate(
        query: { page: number; size: number },
        cb: (query: SelectQueryBuilder<T>) => void,
    ): Promise<PaginateData<T>> {
        const page = Math.max(1, Number(query.page) || 1);
        const size = Number(query.size) || 20;
        const queryBuilder = this.createQueryBuilder();
        cb(queryBuilder);
        const total = await queryBuilder.getCount();
        const rows = await queryBuilder
            .offset((page - 1) * size)
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
