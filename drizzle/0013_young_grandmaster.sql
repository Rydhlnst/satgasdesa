CREATE INDEX `audit_log_entity_created_idx` ON `audit_log` (`entity_type`,`entity_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notification_recipient_read_created_idx` ON `notification` (`recipient_user_id`,`read_at`,`created_at`);--> statement-breakpoint
SET @drop_audit_entity_idx = (SELECT IF(COUNT(*) > 0, 'DROP INDEX `audit_log_entity_idx` ON `audit_log`', 'SELECT 1') FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'audit_log' AND index_name = 'audit_log_entity_idx');--> statement-breakpoint
PREPARE drop_audit_entity_idx FROM @drop_audit_entity_idx;--> statement-breakpoint
EXECUTE drop_audit_entity_idx;--> statement-breakpoint
DEALLOCATE PREPARE drop_audit_entity_idx;--> statement-breakpoint
SET @drop_notification_read_idx = (SELECT IF(COUNT(*) > 0, 'DROP INDEX `notification_recipient_read_idx` ON `notification`', 'SELECT 1') FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = 'notification' AND index_name = 'notification_recipient_read_idx');--> statement-breakpoint
PREPARE drop_notification_read_idx FROM @drop_notification_read_idx;--> statement-breakpoint
EXECUTE drop_notification_read_idx;--> statement-breakpoint
DEALLOCATE PREPARE drop_notification_read_idx;
