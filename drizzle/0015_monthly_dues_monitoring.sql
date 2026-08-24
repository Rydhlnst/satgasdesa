CREATE TABLE `business_actor` (
  `id` varchar(36) NOT NULL,
  `actor_type` varchar(16) NOT NULL,
  `name` varchar(160) NOT NULL,
  `representative_name` varchar(160),
  `contact` varchar(64),
  `address` text,
  `notes` text,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  CONSTRAINT `business_actor_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE `block_field_assignment` (
  `id` varchar(36) NOT NULL,
  `block_id` varchar(36) NOT NULL,
  `field_officer_id` varchar(36) NOT NULL,
  `started_at` date NOT NULL,
  `ended_at` date,
  `notes` text,
  `assigned_by` varchar(36) NOT NULL,
  `created_at` timestamp NOT NULL,
  `updated_at` timestamp NOT NULL,
  CONSTRAINT `block_field_assignment_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
CREATE TABLE `due_payment_verification` (
  `id` varchar(36) NOT NULL,
  `due_payment_id` varchar(36) NOT NULL,
  `verified_by` varchar(36) NOT NULL,
  `verification_status` varchar(16) NOT NULL,
  `verified_at` timestamp NOT NULL,
  `latitude` decimal(10,7),
  `longitude` decimal(10,7),
  `gps_accuracy` decimal(10,2),
  `evidence_key` varchar(255),
  `notes` text,
  `created_at` timestamp NOT NULL,
  CONSTRAINT `due_payment_verification_id` PRIMARY KEY(`id`)
);--> statement-breakpoint
ALTER TABLE `excavator` ADD `business_actor_id` varchar(36);--> statement-breakpoint
ALTER TABLE `due` ADD `block_id` varchar(36);--> statement-breakpoint
ALTER TABLE `due` ADD `business_actor_id` varchar(36);--> statement-breakpoint
ALTER TABLE `block_field_assignment` ADD CONSTRAINT `block_field_assignment_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `block_field_assignment` ADD CONSTRAINT `block_field_assignment_field_officer_id_user_id_fk` FOREIGN KEY (`field_officer_id`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `block_field_assignment` ADD CONSTRAINT `block_field_assignment_assigned_by_user_id_fk` FOREIGN KEY (`assigned_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due_payment_verification` ADD CONSTRAINT `due_payment_verification_due_payment_id_due_payment_id_fk` FOREIGN KEY (`due_payment_id`) REFERENCES `due_payment`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due_payment_verification` ADD CONSTRAINT `due_payment_verification_verified_by_user_id_fk` FOREIGN KEY (`verified_by`) REFERENCES `user`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `excavator` ADD CONSTRAINT `excavator_business_actor_id_business_actor_id_fk` FOREIGN KEY (`business_actor_id`) REFERENCES `business_actor`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due` ADD CONSTRAINT `due_block_id_block_id_fk` FOREIGN KEY (`block_id`) REFERENCES `block`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `due` ADD CONSTRAINT `due_business_actor_id_business_actor_id_fk` FOREIGN KEY (`business_actor_id`) REFERENCES `business_actor`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `business_actor_name_idx` ON `business_actor` (`name`);--> statement-breakpoint
CREATE INDEX `business_actor_contact_idx` ON `business_actor` (`contact`);--> statement-breakpoint
CREATE INDEX `block_field_assignment_officer_active_idx` ON `block_field_assignment` (`field_officer_id`,`ended_at`);--> statement-breakpoint
CREATE INDEX `block_field_assignment_block_active_idx` ON `block_field_assignment` (`block_id`,`ended_at`);--> statement-breakpoint
CREATE INDEX `due_payment_verification_payment_verified_idx` ON `due_payment_verification` (`due_payment_id`,`verified_at`);--> statement-breakpoint
CREATE INDEX `due_payment_verification_officer_verified_idx` ON `due_payment_verification` (`verified_by`,`verified_at`);--> statement-breakpoint
CREATE INDEX `excavator_business_actor_idx` ON `excavator` (`business_actor_id`);--> statement-breakpoint
CREATE INDEX `due_block_reference_idx` ON `due` (`block_id`,`reference_key`);--> statement-breakpoint
CREATE INDEX `due_actor_reference_idx` ON `due` (`business_actor_id`,`reference_key`);--> statement-breakpoint
INSERT INTO `business_actor` (`id`, `actor_type`, `name`, `created_at`, `updated_at`)
SELECT UUID(), 'INDIVIDUAL', `operator_name`, NOW(), NOW()
FROM `excavator`
WHERE `operator_name` IS NOT NULL AND TRIM(`operator_name`) <> ''
GROUP BY `operator_name`;--> statement-breakpoint
UPDATE `excavator` e INNER JOIN `business_actor` a ON a.`name` = e.`operator_name`
SET e.`business_actor_id` = a.`id`
WHERE e.`business_actor_id` IS NULL;--> statement-breakpoint
UPDATE `due` d INNER JOIN `excavator` e ON e.`id` = d.`excavator_id`
SET d.`business_actor_id` = e.`business_actor_id`
WHERE d.`business_actor_id` IS NULL;--> statement-breakpoint
UPDATE `due` d INNER JOIN `excavator_movement` m ON m.`id` = d.`source_movement_id`
SET d.`block_id` = m.`to_block_id`
WHERE d.`block_id` IS NULL AND m.`to_block_id` IS NOT NULL;--> statement-breakpoint
UPDATE `due` d INNER JOIN `excavator` e ON e.`id` = d.`excavator_id`
SET d.`block_id` = e.`current_block_id`
WHERE d.`block_id` IS NULL AND e.`current_block_id` IS NOT NULL;
