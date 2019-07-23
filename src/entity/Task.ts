import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BaseEntity } from 'typeorm';
import * as moment from 'moment';

/**
 * 任務 (顧客加入系統後開始)
 */
@Entity()
export class Task extends BaseEntity {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    /**
     * 顧客 id (由介接系統提供, 非必填)
     */
    @Column({
        name: 'customer_id',
        type: 'varchar',
        length: 50,
        nullable: true,
        default: null,
    })
    public customerId!: string;

    /**
     * 顧客 name (顧客加入系統填寫的名稱)
     */
    @Column({
        name: 'customer_name',
        type: 'varchar',
        length: 20,
        nullable: false,
    })
    public customerName!: string;

    @Column({
        name: 'executive_id',
        type: 'integer',
        unsigned: true,
        nullable: false,
    })
    public executiveId!: number;

    @Column({
        type: 'tinyint',
        unsigned: true,
        nullable: false,
    })
    public score!: number;

    @Column({
        name: 'start_at',
        nullable: true,
        default: null,
        type: 'datetime',
    })
    public startAt!: string;

    @Column({
        name: 'closed_at',
        nullable: true,
        default: null,
        type: 'datetime',
    })
    public closedAt!: string | null;

    @CreateDateColumn({
        name: 'created_at',
        nullable: true,
        default: null,
        type: 'datetime',
    })
    public createdAt!: string;

    get intStartAt() {
        return this.startAt ? moment(this.startAt).valueOf() : 0;
    }
    get intCreatedAt() {
        return this.createdAt ? moment(this.createdAt).valueOf() : 0;
    }
    get intClosedAt() {
        return this.closedAt ? moment(this.closedAt).valueOf() : 0;
    }
}
