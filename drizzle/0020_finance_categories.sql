CREATE TABLE `finance_category` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`transaction_type` varchar(16) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`sort_order` int NOT NULL DEFAULT 0,
	`created_by` varchar(36) NOT NULL,
	`created_at` timestamp NOT NULL,
	`updated_at` timestamp NOT NULL,
	CONSTRAINT `finance_category_id` PRIMARY KEY(`id`),
	CONSTRAINT `finance_category_type_name_unique` UNIQUE(`transaction_type`,`name`)
);
--> statement-breakpoint
ALTER TABLE `financial_transaction` ADD `category_id` varchar(36);--> statement-breakpoint
ALTER TABLE `finance_category` ADD CONSTRAINT `finance_category_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `finance_category_active_type_sort_idx` ON `finance_category` (`is_active`,`transaction_type`,`sort_order`);--> statement-breakpoint
ALTER TABLE `financial_transaction` ADD CONSTRAINT `financial_transaction_category_id_finance_category_id_fk` FOREIGN KEY (`category_id`) REFERENCES `finance_category`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `financial_transaction_category_date_idx` ON `financial_transaction` (`category_id`,`transaction_at`);