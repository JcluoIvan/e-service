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
import { Ips } from './IPS';
import { LogUserLogin } from './LogUserLogin';

export enum UserRole {
    /* 主管 */
    Supervisor = 'supervisor',
    /* 專員 */
    Executive = 'executive',
}

@Entity()
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
        select: false,
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
        type: 'varchar',
        length: 50,
        nullable: true,
        default: null,
    })
    public image!: string | null;

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

    @Column({
        type: 'bool',
        default: true,
    })
    public enabled!: boolean;

    @Column({
        type: 'integer',
        name: 'login_errors',
        default: 0,
    })
    public loginErrors!: number;

    @Column({
        name: 'updated_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public updatedAt!: string;

    @Column({
        name: 'created_at',
        nullable: true,
        default: null,
        type: 'timestamp',
    })
    public createdAt!: string;

    public articles!: Article[];

    /* for join last log_user_login info */
    public logLast!: LogUserLogin | null;

    /* for join ips */
    public ipInfo!: Ips | null;

    get imageUrl() {
        return this.image ? `${process.env.USER__IMAGE_URL}/${this.image}` : '';
    }

    get isSupervisor() {
        return this.role === UserRole.Supervisor;
    }

    get isErrorLocked() {
        return this.loginErrors > 5;
    }

    public setPassword(password: string) {
        this.password = password;
    }

    public checkPassword(password: string) {
        return this.password === password;
    }
}
