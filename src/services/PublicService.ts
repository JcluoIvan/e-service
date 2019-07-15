import { getConnection } from 'typeorm';
import { Firm } from '../entity/Firm';
import { FirmNotFound } from '../exceptions/connect.errors';
import logger from '../logger';

export default class PublicService {
    public async onConnect(socket: SIO.User.Socket, namespace: string) {
        const firm = await getConnection()
            .getRepository(Firm)
            .createQueryBuilder('firm')
            .where('namespace = :namespace', { namespace })
            .getOne();

        if (!firm) {
            throw new FirmNotFound();
        }

        socket.emit('firm', {
            id: firm.id,
            name: firm.name,
        });
        return firm;
    }
}
