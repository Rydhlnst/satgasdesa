ALTER TABLE `realization_approval` MODIFY COLUMN `action` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `realization_request` ADD `fund_request_id` varchar(36);--> statement-breakpoint
ALTER TABLE `realization_request` ADD `activity` varchar(255);--> statement-breakpoint
ALTER TABLE `realization_request` ADD `realization_date` date;--> statement-breakpoint
ALTER TABLE `realization_request` ADD `receipt_number` varchar(100);--> statement-breakpoint
ALTER TABLE `realization_request` ADD `calculation_snapshot` json;--> statement-breakpoint
ALTER TABLE `realization_request` ADD `submitted_at` timestamp;--> statement-breakpoint
ALTER TABLE `realization_request` ADD `verified_at` timestamp;--> statement-breakpoint
ALTER TABLE `realization_request` ADD `approved_at` timestamp;--> statement-breakpoint
ALTER TABLE `realization_request` ADD `reversed_at` timestamp;--> statement-breakpoint
ALTER TABLE `realization_request` ADD `reversed_by` varchar(36);--> statement-breakpoint
ALTER TABLE `realization_request` ADD `reversal_reason` text;--> statement-breakpoint
ALTER TABLE `realization_request` ADD `reversal_transaction_id` varchar(36);--> statement-breakpoint
ALTER TABLE `realization_evidence` ADD `caption` varchar(255);--> statement-breakpoint
ALTER TABLE `realization_request` ADD CONSTRAINT `realization_request_reversed_by_user_id_fk` FOREIGN KEY (`reversed_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `realization_fund_request_idx` ON `realization_request` (`fund_request_id`);--> statement-breakpoint
CREATE INDEX `realization_date_idx` ON `realization_request` (`realization_date`);