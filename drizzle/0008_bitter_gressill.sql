CREATE TABLE `block_history` (
	`id` varchar(36) NOT NULL,
	`block_id` varchar(36) NOT NULL,
	`action` varchar(32) NOT NULL,
	`old_values` text,
	`new_values` text,
	`changed_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `block_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `realization_approval` (
	`id` varchar(36) NOT NULL,
	`realization_id` varchar(36) NOT NULL,
	`action` varchar(16) NOT NULL,
	`notes` text,
	`actor_user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `realization_approval_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `realization_evidence` (
	`id` varchar(36) NOT NULL,
	`realization_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `realization_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaction_evidence` (
	`id` varchar(36) NOT NULL,
	`transaction_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `transaction_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification` (
	`id` varchar(36) NOT NULL,
	`recipient_user_id` varchar(36) NOT NULL,
	`type` varchar(64) NOT NULL,
	`title` varchar(255) NOT NULL,
	`body` text NOT NULL,
	`related_entity_type` varchar(64),
	`related_entity_id` varchar(36),
	`read_at` timestamp,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `notification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `block_history` ADD CONSTRAINT `block_history_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `block_history` ADD CONSTRAINT `block_history_changed_by_user_id_fk` FOREIGN KEY (`changed_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `realization_approval` ADD CONSTRAINT `realization_approval_realization_id_realization_request_id_fk` FOREIGN KEY (`realization_id`) REFERENCES `realization_request`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `realization_approval` ADD CONSTRAINT `realization_approval_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `realization_evidence` ADD CONSTRAINT `realization_evidence_realization_id_realization_request_id_fk` FOREIGN KEY (`realization_id`) REFERENCES `realization_request`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `realization_evidence` ADD CONSTRAINT `realization_evidence_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction_evidence` ADD CONSTRAINT `transaction_evidence_transaction_id_financial_transaction_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `financial_transaction`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `transaction_evidence` ADD CONSTRAINT `transaction_evidence_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notification` ADD CONSTRAINT `notification_recipient_user_id_user_id_fk` FOREIGN KEY (`recipient_user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `block_history_block_created_idx` ON `block_history` (`block_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `realization_approval_realization_idx` ON `realization_approval` (`realization_id`);--> statement-breakpoint
CREATE INDEX `realization_evidence_realization_idx` ON `realization_evidence` (`realization_id`);--> statement-breakpoint
CREATE INDEX `transaction_evidence_transaction_idx` ON `transaction_evidence` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `notification_recipient_read_idx` ON `notification` (`recipient_user_id`,`read_at`);