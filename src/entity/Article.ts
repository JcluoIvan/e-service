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
    public userId!: string;

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
