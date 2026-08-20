ALTER TABLE `account` ADD `issuer` varchar(255);--> statement-breakpoint
UPDATE `account` SET `issuer` = 'local:credential' WHERE `provider_id` = 'credential' AND `issuer` IS NULL;
