ALTER TABLE `daily_information` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `daily_information` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `daily_information` ADD `gps_accuracy` decimal(10,2);--> statement-breakpoint
ALTER TABLE `daily_information` ADD `gps_captured_at` timestamp;--> statement-breakpoint
ALTER TABLE `inspection` ADD `status` varchar(16) DEFAULT 'SUBMITTED' NOT NULL;--> statement-breakpoint
CREATE INDEX `daily_information_reporter_reported_idx` ON `daily_information` (`reporter_id`,`reported_at`);--> statement-breakpoint
CREATE INDEX `inspection_status_inspected_idx` ON `inspection` (`status`,`inspected_at`);
