CREATE TABLE `fund_request` (
	`id` varchar(36) NOT NULL,
	`request_number` varchar(32) NOT NULL,
	`budget_period_id` varchar(36) NOT NULL,
	`budget_category_id` varchar(36) NOT NULL,
	`budget_subcategory_id` varchar(36),
	`block_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`description` text NOT NULL,
	`amount` bigint NOT NULL,
	`requested_at` date NOT NULL,
	`status` varchar(24) NOT NULL DEFAULT 'DRAFT',
	`revision_of_id` varchar(36),
	`correction_reason` text,
	`cancellation_reason` text,
	`submitted_at` timestamp,
	`verified_at` timestamp,
	`approved_at` timestamp,
	`created_by` varchar(36) NOT NULL,
	`verified_by` varchar(36),
	`approved_by` varchar(36),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `fund_request_id` PRIMARY KEY(`id`),
	CONSTRAINT `fund_request_number_unique` UNIQUE(`request_number`),
	CONSTRAINT `fund_request_amount_range_check` CHECK(`fund_request`.`amount` > 0 AND `fund_request`.`amount` <= 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE `fund_request_attachment` (
	`id` varchar(36) NOT NULL,
	`fund_request_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`size_bytes` bigint NOT NULL,
	`caption` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `fund_request_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fund_request_event` (
	`id` varchar(36) NOT NULL,
	`fund_request_id` varchar(36) NOT NULL,
	`action` varchar(32) NOT NULL,
	`notes` text,
	`actor_user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `fund_request_event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `fund_request` ADD CONSTRAINT `fund_request_budget_period_id_budget_period_id_fk` FOREIGN KEY (`budget_period_id`) REFERENCES `budget_period`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request` ADD CONSTRAINT `fund_request_budget_category_id_budget_category_id_fk` FOREIGN KEY (`budget_category_id`) REFERENCES `budget_category`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request` ADD CONSTRAINT `fund_request_budget_subcategory_id_budget_subcategory_id_fk` FOREIGN KEY (`budget_subcategory_id`) REFERENCES `budget_subcategory`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request` ADD CONSTRAINT `fund_request_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request` ADD CONSTRAINT `fund_request_revision_of_id_fund_request_id_fk` FOREIGN KEY (`revision_of_id`) REFERENCES `fund_request`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request` ADD CONSTRAINT `fund_request_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request` ADD CONSTRAINT `fund_request_verified_by_user_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request` ADD CONSTRAINT `fund_request_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request_attachment` ADD CONSTRAINT `fund_request_attachment_fund_request_id_fund_request_id_fk` FOREIGN KEY (`fund_request_id`) REFERENCES `fund_request`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request_attachment` ADD CONSTRAINT `fund_request_attachment_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request_event` ADD CONSTRAINT `fund_request_event_fund_request_id_fund_request_id_fk` FOREIGN KEY (`fund_request_id`) REFERENCES `fund_request`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `fund_request_event` ADD CONSTRAINT `fund_request_event_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `fund_request_period_status_created_idx` ON `fund_request` (`budget_period_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `fund_request_category_status_idx` ON `fund_request` (`budget_category_id`,`status`);--> statement-breakpoint
CREATE INDEX `fund_request_block_status_idx` ON `fund_request` (`block_id`,`status`);--> statement-breakpoint
CREATE INDEX `fund_request_created_by_status_idx` ON `fund_request` (`created_by`,`status`);--> statement-breakpoint
CREATE INDEX `fund_request_revision_of_idx` ON `fund_request` (`revision_of_id`);--> statement-breakpoint
CREATE INDEX `fund_request_attachment_request_created_idx` ON `fund_request_attachment` (`fund_request_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `fund_request_event_request_created_idx` ON `fund_request_event` (`fund_request_id`,`created_at`);