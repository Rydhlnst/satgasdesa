ALTER TABLE `realization_evidence` ADD `content_type` varchar(100);--> statement-breakpoint
ALTER TABLE `realization_evidence` ADD `size_bytes` int;--> statement-breakpoint
ALTER TABLE `transaction_evidence` ADD `content_type` varchar(100);--> statement-breakpoint
ALTER TABLE `transaction_evidence` ADD `size_bytes` int;