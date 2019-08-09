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

export enum AutoSend {
    None = 'none',
    Connected = 'connected',
    Start = 'start',
}

@Entity()
export class Article extends BaseEntity {
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
        type: 'boolean',
        default: 1,
    })
    public share!: boolean;

    @Column({
        type: 'varchar',
        length: 20,
    })
    public key!: string;

    @Column({
        type: 'varchar',
        length: 200,
    })
    public content!: string;

    @Column({
        name: 'auto_send',
        type: 'enum',
        enum: AutoSend,
        default: AutoSend.None,
    })
    public autoSend!: AutoSend;

    /**
     * 順序
     */
    @Column({
        type: 'int',
        default: 0,
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
}
