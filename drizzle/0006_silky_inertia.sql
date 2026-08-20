CREATE TABLE `daily_information` (
	`id` varchar(36) NOT NULL,
	`block_id` varchar(36),
	`reporter_id` varchar(36) NOT NULL,
	`reported_at` timestamp NOT NULL,
	`category` varchar(32) NOT NULL,
	`priority` varchar(16) NOT NULL,
	`description` text NOT NULL,
	`documentation` text,
	`follow_up` text,
	`status` varchar(16) NOT NULL DEFAULT 'NEW',
	`last_updated_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `daily_information_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `daily_information` ADD CONSTRAINT `daily_information_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_information` ADD CONSTRAINT `daily_information_reporter_id_user_id_fk` FOREIGN KEY (`reporter_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_information` ADD CONSTRAINT `daily_information_last_updated_by_user_id_fk` FOREIGN KEY (`last_updated_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `daily_information_status_reported_idx` ON `daily_information` (`status`,`reported_at`);--> statement-breakpoint
CREATE INDEX `daily_information_block_reported_idx` ON `daily_information` (`block_id`,`reported_at`);--> statement-breakpoint
CREATE INDEX `daily_information_priority_reported_idx` ON `daily_information` (`priority`,`reported_at`);