# e-service

客服後端

#### 首次執行
1. ` npm i  `
2. 修改設定檔
  - 修改 ormconfig.json 中的 `replication.master.*` 與 `replication.slaves` 連線資訊
  - 複制 `.env.example.txt` 改名為 `.env`, 修改內部的檔案路徑位置
3. 建立資料庫 (表名稱自定), character set = utf8mb4`
4. 編譯程式碼 `npm run build`, 產生編譯後的檔案至 `/dist` 
4. 建資料表
  - 執行指令 `npm run g-db` 建立 migrations 檔案 (必需先完成 step.4 產生編譯檔)
  - 執行指令 `npm run r-db` 執行 migration
5. 執行以下 sql 建立預設資料
```
INSERT INTO `company` VALUES
	(null, 'es', 'es', NOW(), NOW());

INSERT INTO `user` VALUES
	(null, 1, 'admin', 'admin', 'admin', '', 'supervisor', '', 1, 0, NOW(), NOW());
```
6. 執行 `node dist/index` 啟動 server
- [客戶端 http://127.0.0.1:8080](http://127.0.0.1:8080)
  - [客戶端 web code](https://github.com/JcluoIvan/e-service-customer)
- [管理端 http://127.0.0.1:8080/service](http://127.0.0.1:8080/service)
  - [管理端 web code](https://github.com/JcluoIvan/e-service-web)

#### 其他應注意
- ORM 使用 [typeorm](https://github.com/typeorm/typeorm), 不算完整的 orm 架構
- 管理端密碼未加密 (為了安全，後續開發建立加密儲存)
- 表 compony 原本預計用來切分不同使用客戶，目前功能未實現

