CREATE TABLE `budget_group` (
	`id` varchar(36) NOT NULL,
	`period_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`sort_order` int NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `budget_group_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_item` (
	`id` varchar(36) NOT NULL,
	`group_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`allocated_amount` bigint NOT NULL,
	`notes` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `budget_item_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_period` (
	`id` varchar(36) NOT NULL,
	`period_key` varchar(7) NOT NULL,
	`opening_balance` bigint NOT NULL,
	`estimated_income` bigint NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'DRAFT',
	`approval_notes` text,
	`created_by` varchar(36) NOT NULL,
	`approved_by` varchar(36),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `budget_period_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_period_key_unique` UNIQUE(`period_key`)
);
--> statement-breakpoint
CREATE TABLE `budget_revision` (
	`id` varchar(36) NOT NULL,
	`budget_item_id` varchar(36) NOT NULL,
	`previous_amount` bigint NOT NULL,
	`next_amount` bigint NOT NULL,
	`reason` text NOT NULL,
	`revised_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `budget_revision_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `realization_request` (
	`id` varchar(36) NOT NULL,
	`budget_item_id` varchar(36) NOT NULL,
	`requested_amount` bigint NOT NULL,
	`description` text NOT NULL,
	`evidence_key` varchar(255),
	`status` varchar(16) NOT NULL DEFAULT 'DRAFT',
	`is_over_allocation` int NOT NULL DEFAULT 0,
	`created_by` varchar(36) NOT NULL,
	`verified_by` varchar(36),
	`approved_by` varchar(36),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `realization_request_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `due` (
	`id` varchar(36) NOT NULL,
	`excavator_id` varchar(36) NOT NULL,
	`source_movement_id` varchar(36),
	`due_type` varchar(16) NOT NULL,
	`reference_key` varchar(64) NOT NULL,
	`payer_name` varchar(160) NOT NULL,
	`amount_due` bigint NOT NULL,
	`amount_paid` bigint NOT NULL DEFAULT 0,
	`status` varchar(16) NOT NULL DEFAULT 'UNPAID',
	`due_date` date NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `due_id` PRIMARY KEY(`id`),
	CONSTRAINT `due_excavator_type_reference_unique` UNIQUE(`excavator_id`,`due_type`,`reference_key`),
	CONSTRAINT `due_source_movement_unique` UNIQUE(`source_movement_id`)
);
--> statement-breakpoint
CREATE TABLE `due_payment` (
	`id` varchar(36) NOT NULL,
	`due_id` varchar(36) NOT NULL,
	`payer_name` varchar(160) NOT NULL,
	`payment_date` date NOT NULL,
	`amount` bigint NOT NULL,
	`method` varchar(32) NOT NULL,
	`evidence_key` varchar(255),
	`notes` text,
	`recorded_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `due_payment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `financial_transaction` (
	`id` varchar(36) NOT NULL,
	`transaction_code` varchar(64) NOT NULL,
	`transaction_at` timestamp NOT NULL,
	`transaction_type` varchar(16) NOT NULL,
	`amount` bigint NOT NULL,
	`description` text NOT NULL,
	`related_entity_type` varchar(64),
	`related_entity_id` varchar(36),
	`evidence_key` varchar(255),
	`status` varchar(16) NOT NULL DEFAULT 'DRAFT',
	`created_by` varchar(36) NOT NULL,
	`approved_by` varchar(36),
	`reversed_transaction_id` varchar(36),
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `financial_transaction_id` PRIMARY KEY(`id`),
	CONSTRAINT `financial_transaction_code_unique` UNIQUE(`transaction_code`)
);
--> statement-breakpoint
ALTER TABLE `budget_group` ADD CONSTRAINT `budget_group_period_id_budget_period_id_fk` FOREIGN KEY (`period_id`) REFERENCES `budget_period`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_item` ADD CONSTRAINT `budget_item_group_id_budget_group_id_fk` FOREIGN KEY (`group_id`) REFERENCES `budget_group`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_period` ADD CONSTRAINT `budget_period_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_period` ADD CONSTRAINT `budget_period_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_revision` ADD CONSTRAINT `budget_revision_budget_item_id_budget_item_id_fk` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_item`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_revision` ADD CONSTRAINT `budget_revision_revised_by_user_id_fk` FOREIGN KEY (`revised_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `realization_request` ADD CONSTRAINT `realization_request_budget_item_id_budget_item_id_fk` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_item`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `realization_request` ADD CONSTRAINT `realization_request_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `realization_request` ADD CONSTRAINT `realization_request_verified_by_user_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `realization_request` ADD CONSTRAINT `realization_request_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due` ADD CONSTRAINT `due_excavator_id_excavator_id_fk` FOREIGN KEY (`excavator_id`) REFERENCES `excavator`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due` ADD CONSTRAINT `due_source_movement_id_excavator_movement_id_fk` FOREIGN KEY (`source_movement_id`) REFERENCES `excavator_movement`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due` ADD CONSTRAINT `due_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due_payment` ADD CONSTRAINT `due_payment_due_id_due_id_fk` FOREIGN KEY (`due_id`) REFERENCES `due`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due_payment` ADD CONSTRAINT `due_payment_recorded_by_user_id_fk` FOREIGN KEY (`recorded_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_transaction` ADD CONSTRAINT `financial_transaction_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `financial_transaction` ADD CONSTRAINT `financial_transaction_approved_by_user_id_fk` FOREIGN KEY (`approved_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `budget_group_period_idx` ON `budget_group` (`period_id`);--> statement-breakpoint
CREATE INDEX `budget_item_group_idx` ON `budget_item` (`group_id`);--> statement-breakpoint
CREATE INDEX `budget_period_status_idx` ON `budget_period` (`status`);--> statement-breakpoint
CREATE INDEX `budget_revision_item_idx` ON `budget_revision` (`budget_item_id`);--> statement-breakpoint
CREATE INDEX `realization_item_status_idx` ON `realization_request` (`budget_item_id`,`status`);--> statement-breakpoint
CREATE INDEX `realization_status_idx` ON `realization_request` (`status`);--> statement-breakpoint
CREATE INDEX `due_status_due_date_idx` ON `due` (`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `due_payment_due_date_idx` ON `due_payment` (`due_id`,`payment_date`);--> statement-breakpoint
CREATE INDEX `financial_transaction_status_date_idx` ON `financial_transaction` (`status`,`transaction_at`);--> statement-breakpoint
CREATE INDEX `financial_transaction_related_entity_idx` ON `financial_transaction` (`related_entity_type`,`related_entity_id`);