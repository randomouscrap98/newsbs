START TRANSACTION;
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
