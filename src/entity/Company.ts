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
