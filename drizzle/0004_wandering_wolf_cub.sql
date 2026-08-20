CREATE TABLE `block_manager` (
	`id` varchar(36) NOT NULL,
	`block_id` varchar(36) NOT NULL,
	`assignment_role` varchar(16) NOT NULL,
	`person_name` varchar(160) NOT NULL,
	`contact` varchar(64),
	`started_at` date NOT NULL,
	`ended_at` date,
	`notes` text,
	`assigned_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `block_manager_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `block_manager` ADD CONSTRAINT `block_manager_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `block_manager` ADD CONSTRAINT `block_manager_assigned_by_user_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `block_manager_block_role_ended_idx` ON `block_manager` (`block_id`,`assignment_role`,`ended_at`);--> statement-breakpoint
CREATE INDEX `block_manager_person_name_idx` ON `block_manager` (`person_name`);