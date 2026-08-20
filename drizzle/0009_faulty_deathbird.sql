CREATE TABLE `daily_information_attachment` (
	`id` varchar(36) NOT NULL,
	`daily_information_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`size_bytes` int NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `daily_information_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `daily_information_followup` (
	`id` varchar(36) NOT NULL,
	`daily_information_id` varchar(36) NOT NULL,
	`note` text NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `daily_information_followup_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_dispatch` (
	`id` varchar(36) NOT NULL,
	`rule_key` varchar(64) NOT NULL,
	`target_key` varchar(128) NOT NULL,
	`recipient_user_id` varchar(36) NOT NULL,
	`notification_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `notification_dispatch_id` PRIMARY KEY(`id`),
	CONSTRAINT `notification_dispatch_rule_target_recipient_unique` UNIQUE(`rule_key`,`target_key`,`recipient_user_id`)
);
--> statement-breakpoint
ALTER TABLE `daily_information_attachment` ADD CONSTRAINT `daily_information_attachment_information_fk` FOREIGN KEY (`daily_information_id`) REFERENCES `daily_information`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_information_attachment` ADD CONSTRAINT `daily_information_attachment_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_information_followup` ADD CONSTRAINT `daily_information_followup_information_fk` FOREIGN KEY (`daily_information_id`) REFERENCES `daily_information`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `daily_information_followup` ADD CONSTRAINT `daily_information_followup_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_dispatch` ADD CONSTRAINT `notification_dispatch_recipient_fk` FOREIGN KEY (`recipient_user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification_dispatch` ADD CONSTRAINT `notification_dispatch_notification_fk` FOREIGN KEY (`notification_id`) REFERENCES `notification`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `daily_information_attachment_information_idx` ON `daily_information_attachment` (`daily_information_id`);--> statement-breakpoint
CREATE INDEX `daily_information_followup_information_idx` ON `daily_information_followup` (`daily_information_id`,`created_at`);
