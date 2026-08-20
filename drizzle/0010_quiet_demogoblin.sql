ALTER TABLE `realization_request` ADD `corrects_realization_id` varchar(36);--> statement-breakpoint
ALTER TABLE `realization_request` ADD `correction_reason` text;--> statement-breakpoint
CREATE INDEX `realization_correction_idx` ON `realization_request` (`corrects_realization_id`);