CREATE TABLE `budget_category` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `budget_category_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_category_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `budget_item_attachment` (
	`id` varchar(36) NOT NULL,
	`budget_item_id` varchar(36) NOT NULL,
	`storage_key` varchar(255) NOT NULL,
	`content_type` varchar(100) NOT NULL,
	`size_bytes` int NOT NULL,
	`caption` varchar(255),
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `budget_item_attachment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_period_history` (
	`id` varchar(36) NOT NULL,
	`period_id` varchar(36) NOT NULL,
	`budget_item_id` varchar(36),
	`action` varchar(32) NOT NULL,
	`notes` text,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	CONSTRAINT `budget_period_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_subcategory` (
	`id` varchar(36) NOT NULL,
	`category_id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`is_active` int NOT NULL DEFAULT 1,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `budget_subcategory_id` PRIMARY KEY(`id`),
	CONSTRAINT `budget_subcategory_category_name_unique` UNIQUE(`category_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `budget_group` ADD `category_id` varchar(36);--> statement-breakpoint
ALTER TABLE `budget_item` ADD `subcategory_id` varchar(36);--> statement-breakpoint
INSERT INTO `budget_category` (`id`, `name`, `is_active`, `sort_order`, `created_by`, `created_at`, `updated_at`)
SELECT UUID(), `g`.`name`, 1, MIN(`g`.`sort_order`), MIN(`p`.`created_by`), CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM `budget_group` `g`
INNER JOIN `budget_period` `p` ON `p`.`id` = `g`.`period_id`
LEFT JOIN `budget_category` `c` ON `c`.`name` = `g`.`name`
WHERE `c`.`id` IS NULL
GROUP BY `g`.`name`;--> statement-breakpoint
UPDATE `budget_group` `g`
INNER JOIN `budget_category` `c` ON `c`.`name` = `g`.`name`
SET `g`.`category_id` = `c`.`id`
WHERE `g`.`category_id` IS NULL;--> statement-breakpoint
ALTER TABLE `budget_category` ADD CONSTRAINT `budget_category_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_item_attachment` ADD CONSTRAINT `budget_item_attachment_budget_item_id_budget_item_id_fk` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_item`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_item_attachment` ADD CONSTRAINT `budget_item_attachment_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_period_history` ADD CONSTRAINT `budget_period_history_period_id_budget_period_id_fk` FOREIGN KEY (`period_id`) REFERENCES `budget_period`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_period_history` ADD CONSTRAINT `budget_period_history_budget_item_id_budget_item_id_fk` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_item`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_period_history` ADD CONSTRAINT `budget_period_history_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_subcategory` ADD CONSTRAINT `budget_subcategory_category_id_budget_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `budget_category`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_subcategory` ADD CONSTRAINT `budget_subcategory_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `budget_category_active_sort_idx` ON `budget_category` (`is_active`,`sort_order`);--> statement-breakpoint
CREATE INDEX `budget_item_attachment_item_created_idx` ON `budget_item_attachment` (`budget_item_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `budget_period_history_period_created_idx` ON `budget_period_history` (`period_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `budget_period_history_item_idx` ON `budget_period_history` (`budget_item_id`);--> statement-breakpoint
CREATE INDEX `budget_subcategory_category_active_sort_idx` ON `budget_subcategory` (`category_id`,`is_active`,`sort_order`);--> statement-breakpoint
ALTER TABLE `budget_group` ADD CONSTRAINT `budget_group_category_id_budget_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `budget_category`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_item` ADD CONSTRAINT `budget_item_subcategory_id_budget_subcategory_id_fk` FOREIGN KEY (`subcategory_id`) REFERENCES `budget_subcategory`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `budget_group_category_idx` ON `budget_group` (`category_id`);--> statement-breakpoint
CREATE INDEX `budget_item_subcategory_idx` ON `budget_item` (`subcategory_id`);
