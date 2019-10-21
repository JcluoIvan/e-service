import { EntityRepository } from 'typeorm';
import BaseRepository from './BaseRepository';
import { LogUserLogin } from '../entity/LogUserLogin';

@EntityRepository(LogUserLogin)
export class LogUserLoginRepository extends BaseRepository<LogUserLogin> {}
