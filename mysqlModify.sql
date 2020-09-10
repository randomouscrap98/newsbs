alter table Entities modify `type` varchar(128);
alter table Entities modify `name` varchar(512);
alter table EntityRelations modify `type` varchar(128);

alter database contentapi character set = utf8mb4 collate = utf8mb4_unicode_ci;

alter table Entities convert to character set utf8mb4 collate utf8mb4_unicode_ci;
alter table EntityRelations convert to character set utf8mb4 collate utf8mb4_unicode_ci;
alter table EntityValues convert to character set utf8mb4 collate utf8mb4_unicode_ci;

SHOW VARIABLES WHERE Variable_name LIKE 'character\_set\_%' OR Variable_name LIKE 'collation%';

