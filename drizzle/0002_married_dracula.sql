CREATE TABLE `block` (
	`id` varchar(36) NOT NULL,
	`code` varchar(32) NOT NULL,
	`name` varchar(160) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'NOT_OPERATING',
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`location_photo_key` varchar(255),
	`manager_name` varchar(160),
	`location_pic_name` varchar(160),
	`field_pic_name` varchar(160),
	`contact` varchar(64),
	`worker_count` int NOT NULL DEFAULT 0,
	`operational_condition` text NOT NULL,
	`start_date` date,
	`notes` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `block_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `block_code_idx` ON `block` (`code`);--> statement-breakpoint
CREATE INDEX `block_status_idx` ON `block` (`status`);