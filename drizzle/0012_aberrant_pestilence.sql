ALTER TABLE `block` ADD CONSTRAINT `block_latitude_range_check` CHECK (`block`.`latitude` >= -90 AND `block`.`latitude` <= 90);--> statement-breakpoint
ALTER TABLE `block` ADD CONSTRAINT `block_longitude_range_check` CHECK (`block`.`longitude` >= -180 AND `block`.`longitude` <= 180);--> statement-breakpoint
ALTER TABLE `block` ADD CONSTRAINT `block_worker_count_check` CHECK (`block`.`worker_count` >= 0);--> statement-breakpoint
ALTER TABLE `budget_item` ADD CONSTRAINT `budget_item_allocated_amount_check` CHECK (`budget_item`.`allocated_amount` >= 0 AND `budget_item`.`allocated_amount` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `budget_period` ADD CONSTRAINT `budget_period_opening_balance_check` CHECK (`budget_period`.`opening_balance` >= 0 AND `budget_period`.`opening_balance` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `budget_period` ADD CONSTRAINT `budget_period_estimated_income_check` CHECK (`budget_period`.`estimated_income` >= 0 AND `budget_period`.`estimated_income` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `budget_revision` ADD CONSTRAINT `budget_revision_previous_amount_check` CHECK (`budget_revision`.`previous_amount` >= 0 AND `budget_revision`.`previous_amount` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `budget_revision` ADD CONSTRAINT `budget_revision_next_amount_check` CHECK (`budget_revision`.`next_amount` >= 0 AND `budget_revision`.`next_amount` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `realization_request` ADD CONSTRAINT `realization_requested_amount_check` CHECK (`realization_request`.`requested_amount` > 0 AND `realization_request`.`requested_amount` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `due` ADD CONSTRAINT `due_amount_due_range_check` CHECK (`due`.`amount_due` > 0 AND `due`.`amount_due` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `due` ADD CONSTRAINT `due_amount_paid_range_check` CHECK (`due`.`amount_paid` >= 0 AND `due`.`amount_paid` <= `due`.`amount_due`);--> statement-breakpoint
ALTER TABLE `due_payment` ADD CONSTRAINT `due_payment_amount_range_check` CHECK (`due_payment`.`amount` > 0 AND `due_payment`.`amount` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `financial_transaction` ADD CONSTRAINT `financial_transaction_amount_range_check` CHECK (`financial_transaction`.`amount` > 0 AND `financial_transaction`.`amount` <= 9007199254740991);--> statement-breakpoint
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_latitude_range_check` CHECK (`inspection`.`latitude` >= -90 AND `inspection`.`latitude` <= 90);--> statement-breakpoint
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_longitude_range_check` CHECK (`inspection`.`longitude` >= -180 AND `inspection`.`longitude` <= 180);--> statement-breakpoint
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_gps_accuracy_check` CHECK (`inspection`.`gps_accuracy` >= 0);--> statement-breakpoint
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_excavator_count_check` CHECK (`inspection`.`excavator_count` >= 0);--> statement-breakpoint
ALTER TABLE `inspection` ADD CONSTRAINT `inspection_worker_count_check` CHECK (`inspection`.`worker_count` >= 0);