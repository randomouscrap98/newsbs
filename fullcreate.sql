START TRANSACTION;
CREATE DATABASE contentapi;
USE contentapi;
CREATE TABLE IF NOT EXISTS EntityValues (
	`id`	BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	createDate	DATETIME,
	entityId	BIGINT NOT NULL,
	`key`    VARCHAR(128),
	`value`  VARCHAR(10000)
);
CREATE TABLE IF NOT EXISTS EntityRelations (
	`id`	BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	createDate	DATETIME,
	entityId1	BIGINT NOT NULL,
	entityId2	BIGINT NOT NULL,
	`type`   VARCHAR(128),
	`value`  VARCHAR(10000)
);
CREATE TABLE IF NOT EXISTS Entities (
	`id`	BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
	createDate	DATETIME,
	`type`	VARCHAR(128),
	`name`	VARCHAR(512),
	content MEDIUMTEXT
);
CREATE INDEX entityRelationId1Index ON EntityRelations (
	entityId1
);
CREATE INDEX entityRelationId2Index ON EntityRelations (
	entityId2
);
CREATE INDEX entityRelationTypeIndex ON EntityRelations (
	`type`
);
CREATE INDEX entityValueEntityIdIndex ON EntityValues (
	entityId
);
CREATE INDEX entityValueValueKeyIndex ON EntityValues (
	`key`
);
CREATE INDEX entityTypeIndex ON Entities (
	`type`
);
CREATE INDEX entityNameIndex ON Entities (
	name
);
COMMIT;

alter table Entities modify `type` varchar(128);
alter table Entities modify `name` varchar(512);
alter table EntityRelations modify `type` varchar(128);

alter database contentapi character set = utf8mb4 collate = utf8mb4_unicode_ci;

alter table Entities convert to character set utf8mb4 collate utf8mb4_unicode_ci;
alter table EntityRelations convert to character set utf8mb4 collate utf8mb4_unicode_ci;
alter table EntityValues convert to character set utf8mb4 collate utf8mb4_unicode_ci;

SHOW VARIABLES WHERE Variable_name LIKE 'character\_set\_%' OR Variable_name LIKE 'collation%';

