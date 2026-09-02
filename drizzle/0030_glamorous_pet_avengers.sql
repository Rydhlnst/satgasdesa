CREATE TABLE `budget_change_request` (
	`id` varchar(36) NOT NULL,
	`budget_item_id` varchar(36) NOT NULL,
	`previous_amount` bigint NOT NULL,
	`proposed_amount` bigint NOT NULL,
	`reason` text NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'DRAFT',
	`rejection_reason` text,
	`submitted_at` timestamp,
	`verified_at` timestamp,
	`approved_at` timestamp,
	`created_by` varchar(36) NOT NULL,
	`verified_by` varchar(36),
	`approved_by` varchar(36),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `budget_change_request_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_change_request_previous_amount_check` CHECK(`budget_change_request`.`previous_amount` >= 0 AND `budget_change_request`.`previous_amount` <= 9007199254740991),
	CONSTRAINT `budget_change_request_proposed_amount_check` CHECK(`budget_change_request`.`proposed_amount` >= 0 AND `budget_change_request`.`proposed_amount` <= 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE `budget_change_request_attachment` (
	`id` varchar(36) NOT NULL,
	`change_request_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`size_bytes` int NOT NULL,
	`caption` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `budget_change_request_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_period_attachment` (
	`id` varchar(36) NOT NULL,
	`period_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`size_bytes` int NOT NULL,
	`caption` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `budget_period_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `budget_change_request` ADD CONSTRAINT `budget_change_request_budget_item_id_budget_item_id_fk` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_item`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_change_request` ADD CONSTRAINT `budget_change_request_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_change_request` ADD CONSTRAINT `budget_change_request_verified_by_user_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_change_request` ADD CONSTRAINT `budget_change_request_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_change_request_attachment` ADD CONSTRAINT `budget_change_request_attachment_change_request_id_budget_change_request_id_fk` FOREIGN KEY (`change_request_id`) REFERENCES `budget_change_request`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_change_request_attachment` ADD CONSTRAINT `budget_change_request_attachment_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_period_attachment` ADD CONSTRAINT `budget_period_attachment_period_id_budget_period_id_fk` FOREIGN KEY (`period_id`) REFERENCES `budget_period`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_period_attachment` ADD CONSTRAINT `budget_period_attachment_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `budget_change_request_item_status_idx` ON `budget_change_request` (`budget_item_id`,`status`);--> statement-breakpoint
CREATE INDEX `budget_change_request_status_created_idx` ON `budget_change_request` (`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `budget_change_request_attachment_request_created_idx` ON `budget_change_request_attachment` (`change_request_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `budget_period_attachment_period_created_idx` ON `budget_period_attachment` (`period_id`,`created_at`);--> statement-breakpoint
