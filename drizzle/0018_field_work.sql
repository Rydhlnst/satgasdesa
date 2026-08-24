CREATE TABLE `block_photo` (
	`id` varchar(36) NOT NULL,
	`block_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`size_bytes` int NOT NULL,
	`caption` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `block_photo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_task` (
	`id` varchar(36) NOT NULL,
	`block_id` varchar(36) NOT NULL,
	`assigned_field_officer_id` varchar(36) NOT NULL,
	`assigned_worker_id` varchar(36),
	`title` varchar(255) NOT NULL,
	`description` text,
	`priority` varchar(16) NOT NULL DEFAULT 'MEDIUM',
	`status` varchar(16) NOT NULL DEFAULT 'TODO',
	`due_date` date,
	`completed_at` timestamp,
	`created_by` varchar(36) NOT NULL,
	`updated_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `field_task_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_worker` (
	`id` varchar(36) NOT NULL,
	`full_name` varchar(160) NOT NULL,
	`phone` varchar(64),
	`position` varchar(160),
	`photo_key` varchar(255),
	`status` varchar(16) NOT NULL DEFAULT 'ACTIVE',
	`notes` text,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `field_worker_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `worker_block_assignment` (
	`id` varchar(36) NOT NULL,
	`worker_id` varchar(36) NOT NULL,
	`block_id` varchar(36) NOT NULL,
	`started_at` date NOT NULL,
	`ended_at` date,
	`notes` text,
	`assigned_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `worker_block_assignment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `block` ADD `area_hectares` decimal(12,2);--> statement-breakpoint
ALTER TABLE `block` ADD `priority` varchar(16) DEFAULT 'NORMAL' NOT NULL;--> statement-breakpoint
ALTER TABLE `block` ADD `archived_at` timestamp;--> statement-breakpoint
ALTER TABLE `block` ADD `archived_by` varchar(36);--> statement-breakpoint
ALTER TABLE `block_photo` ADD CONSTRAINT `block_photo_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `block_photo` ADD CONSTRAINT `block_photo_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_task` ADD CONSTRAINT `field_task_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_task` ADD CONSTRAINT `field_task_assigned_field_officer_id_user_id_fk` FOREIGN KEY (`assigned_field_officer_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_task` ADD CONSTRAINT `field_task_assigned_worker_id_field_worker_id_fk` FOREIGN KEY (`assigned_worker_id`) REFERENCES `field_worker`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_task` ADD CONSTRAINT `field_task_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_task` ADD CONSTRAINT `field_task_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `field_worker` ADD CONSTRAINT `field_worker_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `worker_block_assignment` ADD CONSTRAINT `worker_block_assignment_worker_id_field_worker_id_fk` FOREIGN KEY (`worker_id`) REFERENCES `field_worker`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `worker_block_assignment` ADD CONSTRAINT `worker_block_assignment_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `worker_block_assignment` ADD CONSTRAINT `worker_block_assignment_assigned_by_user_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `block_photo_block_created_idx` ON `block_photo` (`block_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `field_task_block_status_due_idx` ON `field_task` (`block_id`,`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `field_task_officer_status_due_idx` ON `field_task` (`assigned_field_officer_id`,`status`,`due_date`);--> statement-breakpoint
CREATE INDEX `field_task_worker_status_idx` ON `field_task` (`assigned_worker_id`,`status`);--> statement-breakpoint
CREATE INDEX `field_worker_status_name_idx` ON `field_worker` (`status`,`full_name`);--> statement-breakpoint
CREATE INDEX `worker_block_assignment_worker_active_idx` ON `worker_block_assignment` (`worker_id`,`ended_at`);--> statement-breakpoint
CREATE INDEX `worker_block_assignment_block_active_idx` ON `worker_block_assignment` (`block_id`,`ended_at`);--> statement-breakpoint
ALTER TABLE `block` ADD CONSTRAINT `block_archived_by_user_id_fk` FOREIGN KEY (`archived_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `block_archive_status_idx` ON `block` (`archived_at`,`status`);--> statement-breakpoint
CREATE INDEX `block_priority_idx` ON `block` (`priority`);