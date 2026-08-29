ALTER TABLE `due_payment`
  ADD COLUMN `status` varchar(16) NOT NULL DEFAULT 'PENDING',
  ADD COLUMN `confirmed_by` varchar(36),
  ADD COLUMN `confirmed_at` timestamp NULL,
  ADD COLUMN `rejected_by` varchar(36),
  ADD COLUMN `rejected_at` timestamp NULL,
  ADD COLUMN `rejection_reason` text,
  ADD COLUMN `financial_transaction_id` varchar(36);

UPDATE `due_payment` SET `status` = 'CONFIRMED' WHERE `status` = 'PENDING';

ALTER TABLE `budget_item`
  ADD COLUMN `progress_percentage` int NOT NULL DEFAULT 0,
  ADD COLUMN `progress_notes` text,
  ADD COLUMN `progress_updated_by` varchar(36),
  ADD COLUMN `progress_updated_at` timestamp NULL;

CREATE TABLE `budget_item_progress_history` (
  `id` varchar(36) NOT NULL,
  `budget_item_id` varchar(36) NOT NULL,
  `previous_percentage` int NOT NULL,
  `next_percentage` int NOT NULL,
  `notes` text,
  `updated_by` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL,
  CONSTRAINT `budget_item_progress_history_id` PRIMARY KEY (`id`),
  CONSTRAINT `budget_item_progress_history_item_fk` FOREIGN KEY (`budget_item_id`) REFERENCES `budget_item`(`id`) ON DELETE CASCADE,
  CONSTRAINT `budget_item_progress_history_user_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE RESTRICT
);

CREATE INDEX `due_payment_status_created_idx` ON `due_payment` (`status`, `created_at`);
CREATE INDEX `budget_item_progress_history_item_created_idx` ON `budget_item_progress_history` (`budget_item_id`, `created_at`);

CREATE TABLE `notification_delivery` (
  `id` varchar(36) NOT NULL,
  `notification_id` varchar(36) NOT NULL,
  `push_device_id` varchar(36),
  `status` varchar(32) NOT NULL,
  `provider_ticket_id` varchar(255),
  `error_code` varchar(128),
  `attempted_at` timestamp NOT NULL,
  CONSTRAINT `notification_delivery_id` PRIMARY KEY (`id`),
  CONSTRAINT `notification_delivery_notification_fk` FOREIGN KEY (`notification_id`) REFERENCES `notification`(`id`) ON DELETE CASCADE
);
CREATE INDEX `notification_delivery_notification_idx` ON `notification_delivery` (`notification_id`, `attempted_at`);
CREATE INDEX `notification_delivery_device_idx` ON `notification_delivery` (`push_device_id`, `attempted_at`);
