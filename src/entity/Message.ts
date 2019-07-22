import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    OneToOne,
    JoinColumn,
    Unique,
    Index,
    BaseEntity,
} from 'typeorm';

export enum MessageType {
    /* 文字內容 */
    Text = 'text',

    /* 圖片 */
    Image = 'image',
}

@Entity()
export class Message extends BaseEntity {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @Column({
        name: 'task_id',
        type: 'integer',
        nullable: false,
        unsigned: true,
    })
    @Index()
    public taskId!: number;

    @Column({
        type: 'varchar',
        length: 300,
        nullable: false,
    })
    public content!: string;

    /** 0 代表顧客發言 */
    @Column({
        name: 'user_id',
        type: 'integer',
        unsigned: true,
        nullable: false,
    })
    public userId!: number;

    @Column({
        type: 'enum',
        enum: MessageType,
    })
    public type!: MessageType;

    /** 檔案是否還存在 */
    @Column({
        name: 'file_exists',
        type: 'tinyint',
        unsigned: true,
        default: 0,
    })
    public fileExists!: number;

    @CreateDateColumn({
        name: 'created_at',
        nullable: true,
        default: null,
        type: 'datetime',
    })
    public createdAt!: string;

    public getContent() {
        return this.type in MessageType ? process.env.MESSAGE__IMAGE_URL + this.content : this.content;
    }
}
