import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BaseEntity } from 'typeorm';
import * as moment from 'moment';
import { Customer } from './Customer';
import { User } from './User';
import { Message } from './Message';
import { Ips } from './IPS';

/**
 * 任務 (訪客加入系統後開始)
 */

export enum TalkStatus {
    Waiting = 'waiting',
    Start = 'start',
    Closed = 'closed',
    Unprocessed = 'unprocessed',
    /* 系統不正常關閉，造成斷線*/
    Shutdown = 'shutdown',
}
@Entity()
export class Talk extends BaseEntity {
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
     * 訪客 id
     */
    @Column({
        name: 'customer_id',
        type: 'int',
        unsigned: true,
    })
    public customerId!: number;

    @Column({
        name: 'executive_id',
        type: 'integer',
        unsigned: true,
        nullable: false,
    })
    public executiveId!: number;

    @Column({
        type: 'varchar',
        length: 42,
    })
    public ip!: string;

    @Column({
        type: 'varchar',
        length: 255,
    })
    public userAgent!: string;

    @Column({
        type: 'varchar',
        length: 50,
    })
    public device!: string;

    @Column({
        type: 'varchar',
        length: 50,
    })
    public browser!: string;

    @Column({
        type: 'varchar',
        length: 50,
    })
    public os!: string;

    @Column({
        type: 'enum',
        enum: TalkStatus,
    })
    public status!: TalkStatus;

    @Column({
        name: 'time_waiting',
        type: 'int',
        unsigned: true,
        default: 0,
    })
    public timeWaiting!: number;

    @Column({
        name: 'time_service',
        type: 'int',
        unsigned: true,
        default: 0,
    })
    public timeService!: number;

    @Column({
        type: 'varchar',
        length: 100,
        nullable: true,
        default: null,
    })
    public remark!: string;

    @Column({
        name: 'start_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public startAt!: string;

    @Column({
        name: 'closed_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public closedAt!: string | null;

    @Column({
        name: 'created_at',
        nullable: true,
        type: 'timestamp',
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

    public messages!: Message[];

    /** for left join */
    public customer!: Customer;
    /** for left join */
    public executive!: User;
    /** for join ips */
    public ipInfo!: Ips | null;
}
