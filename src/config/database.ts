import { createConnections } from 'typeorm';
import { User } from '@/entity/User';

/** load ormconfig.json */
createConnections();

const u = new User();
