import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn, Unique } from 'typeorm';
import { User } from './User';

export enum LoginStatus {
    Success = 'success',
    Failed = 'failed',
}

@Entity()
@Unique(['namespace'])
export class Firm {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: false,
    })
    public namespace!: string;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: false,
    })
    public name!: string;

    @CreateDateColumn({
        name: 'updated_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public updatedAt!: string;

    @CreateDateColumn({
        name: 'created_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public createdAt!: string;
}
