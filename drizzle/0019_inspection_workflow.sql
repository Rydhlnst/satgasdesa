CREATE TABLE `inspection_event` (
	`id` varchar(36) NOT NULL,
	`inspection_id` varchar(36) NOT NULL,
	`action` varchar(32) NOT NULL,
	`notes` text,
	`actor_user_id` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `inspection_event_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `inspection` ADD `road_condition` varchar(64);--> statement-breakpoint
ALTER TABLE `inspection` ADD `environment_condition` varchar(64);--> statement-breakpoint
ALTER TABLE `inspection` ADD `activity_condition` varchar(64);--> statement-breakpoint
ALTER TABLE `inspection_event` ADD CONSTRAINT `inspection_event_inspection_id_inspection_id_fk` FOREIGN KEY (`inspection_id`) REFERENCES `inspection`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspection_event` ADD CONSTRAINT `inspection_event_actor_user_id_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `inspection_event_inspection_created_idx` ON `inspection_event` (`inspection_id`,`created_at`);