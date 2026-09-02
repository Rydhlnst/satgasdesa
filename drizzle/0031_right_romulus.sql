CREATE TABLE `business_actor_user` (
	`business_actor_id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`assigned_at` timestamp NOT NULL,
	`assigned_by` varchar(36),
	CONSTRAINT `business_actor_user_business_actor_id_user_id_pk` PRIMARY KEY(`business_actor_id`,`user_id`),
	CONSTRAINT `business_actor_user_user_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `business_actor_user` ADD CONSTRAINT `business_actor_user_business_actor_id_business_actor_id_fk` FOREIGN KEY (`business_actor_id`) REFERENCES `business_actor`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_actor_user` ADD CONSTRAINT `business_actor_user_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `business_actor_user` ADD CONSTRAINT `business_actor_user_assigned_by_user_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `business_actor_user_user_id_idx` ON `business_actor_user` (`user_id`);