import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    Unique,
    BaseEntity,
} from 'typeorm';

export enum AutoSend {
    None = 'none',
    Connected = 'connected',
    Start = 'start',
    Pause = 'pause',
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
        type: 'varchar',
        length: 50,
    })
    public name!: string;

    @Column({
        name: 'user_id',
        type: 'int',
        unsigned: true,
    })
    public userId!: number;

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

    @Column({
        name: 'updated_at',
        nullable: true,
        type: 'timestamp',
    })
    public updatedAt!: string;

    @Column({
        name: 'created_at',
        nullable: true,
        type: 'timestamp',
    })
    public createdAt!: string;
}
