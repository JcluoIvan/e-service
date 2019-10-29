import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BaseEntity } from 'typeorm';
import * as moment from 'moment';

/**
 * 任務 (顧客加入系統後開始)
 */
@Entity()
export class Customer extends BaseEntity {
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

    /**
     * 顧客 id (由介接系統提供, 非必填)
     */
    @Column({
        type: 'varchar',
        length: 50,
        nullable: true,
        default: null,
    })
    public key!: string;

    /**
     * 顧客 name (顧客加入系統填寫的名稱)
     */
    @Column({
        type: 'varchar',
        length: 20,
        nullable: false,
    })
    public name!: string;

    @CreateDateColumn({
        name: 'created_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public createdAt!: string;
}
