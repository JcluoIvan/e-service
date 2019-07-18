import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn, Unique } from 'typeorm';
import logger from '../logger';

export enum UserRole {
    /* 主管 */
    Supervisor = 'supervisor',
    /* 專員 */
    Executive = 'executive',
}

@Entity()
@Unique(['username'])
export class User {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
    })
    public username!: string | null;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: false,
    })
    public password!: string | null;

    @Column({
        type: 'varchar',
        length: 20,
        nullable: false,
    })
    public name!: string;

    @Column({
        type: 'enum',
        enum: UserRole,
    })
    public role!: UserRole;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: true,
        default: null,
    })
    public token!: string | null;

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

    public checkPassword(password: string) {
        return this.password === password;
    }
}
