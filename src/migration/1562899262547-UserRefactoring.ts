import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserRefactoring1562899262547 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            'CREATE TABLE `user` (`id` int NOT NULL AUTO_INCREMENT, `username` varchar(50) NULL DEFAULT null, `name` varchar(20) NULL DEFAULT null, `token` varchar(50) NULL DEFAULT null, `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6), `created_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6), PRIMARY KEY (`id`)) ENGINE=InnoDB',
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query('DROP TABLE `user`');
    }
}
