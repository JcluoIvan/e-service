import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    public id!: number;

    @Column({
        type: 'varchar',
        length: 50,
        nullable: true,
        default: null,
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
        nullable: true,
        default: null,
    })
    public name!: string | null;

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
