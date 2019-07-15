import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { User } from './User';

export enum LoginStatus {
    Success = 'success',
    Failed = 'failed',
}

@Entity()
export class LogUserLogin {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @OneToOne(() => User)
    @JoinColumn()
    public user!: User;

    @Column({
        type: 'varchar',
        length: 42,
        nullable: true,
    })
    public ip!: string | null;

    @Column({
        type: 'enum',
        enum: LoginStatus,
        nullable: false,
    })
    public status!: LoginStatus;

    @CreateDateColumn({
        name: 'created_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public createdAt!: string;
}
