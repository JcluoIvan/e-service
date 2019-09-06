import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToOne,
    JoinColumn,
    Unique,
    BaseEntity,
} from 'typeorm';
import logger from '../config/logger';
import { Article } from './Article';

@Entity()
export class Sticker extends BaseEntity {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @Column({
        name: 'company_id',
        type: 'int',
        unsigned: true,
    })
    public companyId!: number;

    @Column({
        name: 'user_id',
        type: 'int',
        unsigned: true,
    })
    public userId!: number;

    @Column({
        type: 'varchar',
        length: 50,
    })
    public image!: string;

    @Column({
        type: 'int',
        unsigned: true,
    })
    public odr!: number;

    @CreateDateColumn({
        name: 'updated_at',
        nullable: true,
        default: null,
        type: 'datetime',
    })
    public updatedAt!: string;

    @CreateDateColumn({
        name: 'created_at',
        nullable: true,
        default: null,
        type: 'datetime',
    })
    public createdAt!: string;

    public exists!: Sticker[];

    get imageUrl() {
        return this.image ? `${process.env.STICKER__URL}/${this.image}` : '';
    }
}
