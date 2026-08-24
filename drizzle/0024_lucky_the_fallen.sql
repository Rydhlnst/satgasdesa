CREATE TABLE `app_setting` (
	`key` varchar(64) NOT NULL,
	`value` json NOT NULL,
	`updated_by` varchar(36),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `app_setting_key` PRIMARY KEY(`key`)
);
