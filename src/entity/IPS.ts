import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Unique, BaseEntity } from 'typeorm';
import logger from '../config/logger';
import { Article } from './Article';

export enum UserRole {
    /* 主管 */
    Supervisor = 'supervisor',
    /* 專員 */
    Executive = 'executive',
}

@Entity()
export class Ips extends BaseEntity {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @Column({
        type: 'varchar',
        length: 20,
    })
    public name!: string;

    @Column({
        type: 'varchar',
        length: 20,
    })
    public country!: string;

    @Column({
        type: 'varchar',
        name: 'ip_start',
        length: 42,
    })
    public ipStart!: string;

    @Column({
        type: 'bigint',
        name: 'ip_start_int',
    })
    public ipStartInt!: number;

    @Column({
        type: 'varchar',
        name: 'ip_end',
        length: 42,
    })
    public ipEnd!: string;

    @Column({
        type: 'bigint',
        name: 'ip_end_int',
    })
    public ipEndInt!: number;

    @CreateDateColumn({
        name: 'updated_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public updatedAt!: string;
}
