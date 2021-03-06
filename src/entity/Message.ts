import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BaseEntity } from 'typeorm';
import { User } from './User';

export enum MessageType {
    /* 文字內容 */
    Text = 'text',

    /* 圖片 */
    Image = 'image',

    /* 貼圖 */
    Sticker = 'sticker',
}

export enum FromType {
    System = 'system',
    Service = 'service',
    Customer = 'customer',
}

@Entity()
export class Message extends BaseEntity {
    @PrimaryGeneratedColumn({
        unsigned: true,
    })
    public id!: number;

    @Column({
        name: 'talk_id',
        type: 'integer',
        nullable: false,
        unsigned: true,
    })
    public talkId!: number;

    @Column({
        name: 'from_type',
        type: 'enum',
        enum: FromType,
    })
    public fromType!: FromType;

    @Column({
        type: 'varchar',
        length: 300,
        nullable: false,
    })
    public content!: string;

    /** 0 代表訪客發言 */
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

    @Column({
        name: 'created_at',
        nullable: true,
        type: 'timestamp',
    })
    public createdAt!: string;

    /** for left join */
    public user!: User;

    public getContent() {
        switch (this.type) {
            case MessageType.Image:
                return `${process.env.MESSAGE__IMAGE_URL}/${this.content}`;
            case MessageType.Sticker:
                return `${process.env.STICKER__URL}/${this.content}`;
            default:
                return this.content;
        }
    }
}
