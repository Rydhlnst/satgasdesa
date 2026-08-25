CREATE TABLE `push_device` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`expo_push_token` varchar(255) NOT NULL,
	`platform` varchar(16) NOT NULL,
	`last_seen_at` timestamp NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `push_device_id` PRIMARY KEY(`id`),
	CONSTRAINT `push_device_expo_token_unique` UNIQUE(`expo_push_token`)
);
--> statement-breakpoint
ALTER TABLE `push_device` ADD CONSTRAINT `push_device_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `push_device_user_seen_idx` ON `push_device` (`user_id`,`last_seen_at`);