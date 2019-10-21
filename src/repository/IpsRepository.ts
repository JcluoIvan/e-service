import { EntityRepository, getConnection } from 'typeorm';
import BaseRepository from './BaseRepository';
import { Ips } from '../entity/IPS';
import { ip2int } from '../support';
import logger from '../config/logger';

@EntityRepository(Ips)
export class IpsRepository extends BaseRepository<Ips> {
    public async joinIps<T>(rows: T[], cb: (ips: Ips | null, source: T) => void) {
        const mapRows = rows.map((row: any) => {
            return {
                row,
                ipint: row.ip ? ip2int(row.ip) : 0,
            };
        });

        const query = this.createQueryBuilder('ips')
            .select('ips.name')
            .addSelect('ips.country')
            .addSelect('ips.ipStartInt')
            .addSelect('ips.ipEndInt');
        mapRows.forEach((o, i) => {
            if (o.ipint) {
                query.orWhere(`( :ip${i} BETWEEN ips.ip_start_int AND ips.ip_end_int)`, { [`ip${i}`]: o.ipint });
            }
        });
        const arrIps = await query.getMany();
        mapRows.forEach((o) => {
            const ipsModel = arrIps.find((r) => r.ipStartInt <= o.ipint && r.ipEndInt >= o.ipint) || null;
            cb(ipsModel, o.row);
        });
    }
}
