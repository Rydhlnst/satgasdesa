CREATE TABLE `excavator` (
	`id` varchar(36) NOT NULL,
	`unit_code` varchar(64) NOT NULL,
	`brand` varchar(100) NOT NULL,
	`model` varchar(100) NOT NULL,
	`operator_name` varchar(160),
	`current_block_id` varchar(36),
	`current_entry_date` date,
	`last_exit_date` date,
	`status` varchar(16) NOT NULL DEFAULT 'INACTIVE',
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `excavator_id` PRIMARY KEY(`id`),
	CONSTRAINT `excavator_unit_code_unique` UNIQUE(`unit_code`)
);
--> statement-breakpoint
CREATE TABLE `excavator_movement` (
	`id` varchar(36) NOT NULL,
	`excavator_id` varchar(36) NOT NULL,
	`from_block_id` varchar(36),
	`to_block_id` varchar(36),
	`movement_type` varchar(16) NOT NULL,
	`occurred_at` timestamp NOT NULL,
	`notes` text,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `excavator_movement_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `excavator` ADD CONSTRAINT `excavator_current_block_id_block_id_fk` FOREIGN KEY (`current_block_id`) REFERENCES `block`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excavator_movement` ADD CONSTRAINT `excavator_movement_excavator_id_excavator_id_fk` FOREIGN KEY (`excavator_id`) REFERENCES `excavator`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excavator_movement` ADD CONSTRAINT `excavator_movement_from_block_id_block_id_fk` FOREIGN KEY (`from_block_id`) REFERENCES `block`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excavator_movement` ADD CONSTRAINT `excavator_movement_to_block_id_block_id_fk` FOREIGN KEY (`to_block_id`) REFERENCES `block`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excavator_movement` ADD CONSTRAINT `excavator_movement_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `excavator_current_block_idx` ON `excavator` (`current_block_id`);--> statement-breakpoint
CREATE INDEX `excavator_status_idx` ON `excavator` (`status`);--> statement-breakpoint
CREATE INDEX `excavator_movement_excavator_occurred_idx` ON `excavator_movement` (`excavator_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `excavator_movement_to_block_idx` ON `excavator_movement` (`to_block_id`);