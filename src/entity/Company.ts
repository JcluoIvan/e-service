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
@Unique(['namespace'])
export class Company extends BaseEntity {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @Column({
        type: 'varchar',
        length: 50,
    })
    public name!: string;

    @Column({
        type: 'varchar',
        length: 50,
    })
    public namespace!: string;

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
