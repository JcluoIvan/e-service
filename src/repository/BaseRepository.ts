import { Repository, SelectQueryBuilder, getConnection, BaseEntity } from 'typeorm';
import logger from '../config/logger';
type ObjectType<T> = new () => T;

export interface PaginateData<T> {
    rows: T[];
    total: number;
    size: number;
    page: number;
}

export interface JoinData<O, R> {
    orm: ObjectType<O>;
    name?: string;
    rows: R[];
    col: string;
    joinCol: string;
    buildQuery?: (subQuery: SelectQueryBuilder<O>, values: any[]) => void;
}

export default class BaseRepository<T> extends Repository<T> {
    public async paginate(
        tableName: string,
        query: { page: number; size: number; sorts?: string[] },
        cb: (query: SelectQueryBuilder<T>) => void,
    ): Promise<PaginateData<T>> {
        const page = Math.max(1, Number(query.page) || 1);
        const size = Number(query.size) || 20;
        const queryBuilder = this.createQueryBuilder(tableName);
        if (query.sorts) {
            query.sorts.forEach((str) => {
                const [key, by = 'ASC'] = str.split(',');
                queryBuilder.orderBy(key, by.toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
            });
        }
        cb(queryBuilder);
        const total = await queryBuilder.getCount();
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

    public async joinHasOne<O = any, R = any>(joinData: JoinData<O, R>, cb: (model: O | null, row: R) => void) {
        const { rows, col, name = null, joinCol, orm, buildQuery } = joinData;
        const values = rows.map((row: any) => row[col]).filter((o) => o.value !== null);

        const joinName = name || `join_${joinCol}`;
        const query = getConnection()
            .createQueryBuilder(orm as any, joinName)
            .where(`${joinCol} IN (:...${joinName})`, { [joinName]: values });
        if (buildQuery) {
            buildQuery(query as any, values);
        }

        const res = await query.getMany();
        const joins: any[] = [];
        res.forEach((r: any) => (joins[r[joinCol]] = r));
        rows.forEach((row: any) => {
            const model = joins[row[col]];
            cb(model, row);
        });
    }
}
