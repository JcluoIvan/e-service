import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn, BaseEntity } from 'typeorm';
import { User } from './User';
import { Ips } from './IPS';

export enum LoginStatus {
    Success = 'success',
    Failed = 'failed',
}

@Entity()
export class LogUserLogin extends BaseEntity {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @Column({
        type: 'integer',
        name: 'company_id',
    })
    public companyId!: number;

    @Column({
        type: 'integer',
        name: 'user_id',
    })
    public userId!: number;

    @Column({
        type: 'varchar',
        length: 42,
    })
    public ip!: string;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: true,
    })
    public message!: string;

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
        enum: LoginStatus,
    })
    public status!: LoginStatus;

    @Column({
        name: 'created_at',
        type: 'timestamp',
    })
    public createdAt!: string;

    public get loginAt() {
        return this.createdAt;
    }

    /** for join ips */
    public ipInfo!: Ips | null;
}
