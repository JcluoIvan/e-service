import { Entity, PrimaryGeneratedColumn, Column, BaseEntity } from 'typeorm';

export interface ValueType {
    // 訪客連線至斷線時間小於 N 秒時，自動 close, 0 則停用此功能
    talkConnectLimit: number;
}

const defaultValue: ValueType = {
    talkConnectLimit: 0,
};

@Entity()
export class SystemConfig extends BaseEntity {
    public static newSystemConfig(companyId: number) {
        const config = new SystemConfig();
        config.companyId = companyId;
        config.setValue({ ...defaultValue });
        return config;
    }
    @Column({
        name: 'company_id',
        type: 'int',
        unsigned: true,
        primary: true,
    })
    public companyId!: number;

    @Column({
        type: 'text',
        default: '{}',
    })
    public value!: string;

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

    public updateValue(cb: (value: ValueType) => ValueType) {
        this.setValue(cb(this.getValue()));
    }

    public setValue(data: ValueType) {
        this.value = JSON.stringify(data);
    }

    public getValue(): ValueType {
        return {
            ...defaultValue,
            ...JSON.parse(this.value),
        };
    }
}
