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
import logger from '../logger';

export enum UserRole {
    /* 主管 */
    Supervisor = 'supervisor',
    /* 專員 */
    Executive = 'executive',
}

@Entity()
@Unique(['companyId', 'username'])
export class User extends BaseEntity {
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
        type: 'varchar',
        length: 50,
    })
    public username!: string;

    @Column({
        type: 'varchar',
        length: 50,
    })
    public password!: string;

    @Column({
        type: 'varchar',
        length: 20,
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
