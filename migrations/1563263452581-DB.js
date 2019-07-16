"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
class DB1563263452581 {
    up(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query("CREATE TABLE `user` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `username` varchar(50) NOT NULL, `password` varchar(50) NOT NULL, `name` varchar(20) NOT NULL, `role` enum ('supervisor', 'executive') NOT NULL, `token` varchar(50) NULL DEFAULT null, `updated_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6), `created_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6), UNIQUE INDEX `IDX_78a916df40e02a9deb1c4b75ed` (`username`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
            yield queryRunner.query("CREATE TABLE `log_user_login` (`id` int UNSIGNED NOT NULL AUTO_INCREMENT, `ip` varchar(42) NULL, `status` enum ('success', 'failed') NOT NULL, `created_at` timestamp(6) NULL DEFAULT CURRENT_TIMESTAMP(6), `userId` int UNSIGNED NULL, UNIQUE INDEX `REL_a1a1fd3b6da706a07d3bd10b22` (`userId`), PRIMARY KEY (`id`)) ENGINE=InnoDB");
            yield queryRunner.query("ALTER TABLE `log_user_login` ADD CONSTRAINT `FK_a1a1fd3b6da706a07d3bd10b22c` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION");
        });
    }
    down(queryRunner) {
        return __awaiter(this, void 0, void 0, function* () {
            yield queryRunner.query("ALTER TABLE `log_user_login` DROP FOREIGN KEY `FK_a1a1fd3b6da706a07d3bd10b22c`");
            yield queryRunner.query("DROP INDEX `REL_a1a1fd3b6da706a07d3bd10b22` ON `log_user_login`");
            yield queryRunner.query("DROP TABLE `log_user_login`");
            yield queryRunner.query("DROP INDEX `IDX_78a916df40e02a9deb1c4b75ed` ON `user`");
            yield queryRunner.query("DROP TABLE `user`");
        });
    }
}
exports.DB1563263452581 = DB1563263452581;
