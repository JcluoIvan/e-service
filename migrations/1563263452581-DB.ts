import {MigrationInterface, QueryRunner} from "typeorm";

export class DB1563263452581 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query("CREATE TABLE `user` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `username` varchar(50) NOT NULL, `password` varchar(50) NOT NULL, `name` varchar(20) NOT NULL, `role` enum ('supervisor', 'executive') NOT NULL, `token` varchar(50) NULL DEFAULT null, `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6), `created_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_78a916df40e02a9deb1c4b75ed` (`username`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("CREATE TABLE `log_user_login` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `ip` varchar(42) NULL, `status` enum ('success', 'failed') NOT NULL, `created_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6), `userId` int UNSIGNED NULL, UNIQUE INDEX `REL_a1a1fd3b6da706a07d3bd10b22` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
        await queryRunner.query("ALTER TABLE `log_user_login` ADD CONSTRAINT `FK_a1a1fd3b6da706a07d3bd10b22c` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query("ALTER TABLE `log_user_login` DROP FOREIGN KEY `FK_a1a1fd3b6da706a07d3bd10b22c`");
        await queryRunner.query("DROP INDEX `REL_a1a1fd3b6da706a07d3bd10b22` ON `log_user_login`");
        await queryRunner.query("DROP TABLE `log_user_login`");
        await queryRunner.query("DROP INDEX `IDX_78a916df40e02a9deb1c4b75ed` ON `user`");
        await queryRunner.query("DROP TABLE `user`");
    }

}
