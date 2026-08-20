CREATE TABLE `inspection` (
	`id` varchar(36) NOT NULL,
	`block_id` varchar(36) NOT NULL,
	`inspector_id` varchar(36) NOT NULL,
	`inspected_at` timestamp NOT NULL,
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`gps_accuracy` decimal(10,2) NOT NULL,
	`gps_captured_at` timestamp NOT NULL,
	`excavator_count` int NOT NULL,
	`worker_count` int NOT NULL,
	`condition` text NOT NULL,
	`findings` text,
	`notes` text,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `inspection_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspection_photo` (
	`id` varchar(36) NOT NULL,
	`inspection_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`size_bytes` int NOT NULL,
	`captured_at` timestamp,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `inspection_photo_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_inspector_id_user_id_fk` FOREIGN KEY (`inspector_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_photo` ADD CONSTRAINT `inspection_photo_inspection_id_inspection_id_fk` FOREIGN KEY (`inspection_id`) REFERENCES `inspection`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inspection_block_inspected_idx` ON `inspection` (`block_id`,`inspected_at`);--> statement-breakpoint
CREATE INDEX `inspection_inspector_inspected_idx` ON `inspection` (`inspector_id`,`inspected_at`);--> statement-breakpoint
CREATE INDEX `inspection_photo_inspection_idx` ON `inspection_photo` (`inspection_id`);