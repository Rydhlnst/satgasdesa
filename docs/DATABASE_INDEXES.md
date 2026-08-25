# Database Index Report

This report documents indexes declared in `src/db/schema`. Keep or remove decisions requiring query-plan evidence are marked accordingly.

| Table | Index | Columns | Query served | Decision |
|---|---|---|---|---|
| `user` | `user_email_unique` | `email` | Login, invitation duplicate check | Keep |
| `session` | `session_token_unique` | `token` | Better Auth session lookup | Keep |
| `session` | `session_user_id_idx` | `user_id` | User session lookup | Keep |
| `account` | `account_user_id_idx` | `user_id` | Better Auth account lookup | Keep |
| `verification` | `verification_identifier_idx` | `identifier` | Email/password verification lookup | Keep |
| `audit_log` | `audit_log_actor_user_id_idx` | `actor_user_id` | Audit actor filter | Keep |
| `audit_log` | `audit_log_actor_created_idx` | `actor_user_id, created_at` | Actor audit history ordered by time | Keep |
| `audit_log` | `audit_log_entity_created_idx` | `entity_type, entity_id, created_at` | Entity history lookup ordered by time | Keep |
| `audit_log` | `audit_log_created_at_idx` | `created_at` | Audit time ordering | Keep; consider `(created_at, id)` for keyset pagination |
| `role` | `role_name_unique` | `name` | Role lookup/seed | Keep |
| `permission` | `permission_name_unique` | `name` | Permission lookup/seed | Keep |
| `role_permission` | composite primary key | `role_id, permission_id` | Role permission membership | Keep |
| `role_permission` | `role_permission_permission_id_idx` | `permission_id` | Reverse permission lookup | Keep |
| `user_role` | composite primary key | `user_id, role_id` | User role membership | Keep |
| `user_role` | `user_role_role_id_idx` | `role_id` | Role recipient lookup | Keep |
| `block` | `block_code_idx` | `code` | Block code search/order | Review; code is not unique in current schema |
| `block` | `block_status_idx` | `status` | Status filtering | Review at current small volume |
| `block_manager` | `block_manager_block_role_ended_idx` | `block_id, assignment_role, ended_at` | Active/history manager lookup | Keep |
| `block_manager` | `block_manager_person_name_idx` | `person_name` | Manager name search | Review if unused |
| `excavator` | `excavator_unit_code_unique` | `unit_code` | Duplicate prevention and unit lookup | Keep |
| `excavator` | `excavator_current_block_idx` | `current_block_id` | Block excavator list | Keep |
| `excavator` | `excavator_status_idx` | `status` | Status filtering | Review at current volume |
| `excavator_movement` | `excavator_movement_excavator_occurred_idx` | `excavator_id, occurred_at` | Movement history newest first | Keep |
| `excavator_movement` | `excavator_movement_to_block_idx` | `to_block_id` | Block movement/entry lookup | Keep |
| `inspection` | `inspection_block_inspected_idx` | `block_id, inspected_at` | Block inspection history | Keep |
| `inspection` | `inspection_inspector_inspected_idx` | `inspector_id, inspected_at` | Inspector activity history | Keep |
| `inspection_photo` | `inspection_photo_inspection_idx` | `inspection_id` | Inspection photo lookup | Keep |
| `daily_information` | `daily_information_status_reported_idx` | `status, reported_at` | Open/status lists | Keep |
| `daily_information` | `daily_information_block_reported_idx` | `block_id, reported_at` | Block information history | Keep |
| `daily_information` | `daily_information_priority_reported_idx` | `priority, reported_at` | Critical information scan | Keep |
| `daily_information_followup` | `daily_information_followup_information_idx` | `daily_information_id, created_at` | Follow-up timeline | Keep |
| `daily_information_attachment` | `daily_information_attachment_information_idx` | `daily_information_id` | Attachment list | Keep |
| `due` | `due_excavator_type_reference_unique` | `excavator_id, due_type, reference_key` | Duplicate due prevention | Keep |
| `due` | `due_source_movement_unique` | `source_movement_id` | One road-entry due per movement | Keep |
| `due` | `due_status_due_date_idx` | `status, due_date` | Overdue/status scan | Keep |
| `due_payment` | `due_payment_due_date_idx` | `due_id, payment_date` | Payment history | Keep |
| `financial_transaction` | `financial_transaction_code_unique` | `transaction_code` | Idempotency and transaction lookup | Keep |
| `financial_transaction` | `financial_transaction_status_date_idx` | `status, transaction_at` | Cash/report period scans | Keep |
| `financial_transaction` | `financial_transaction_related_entity_idx` | `related_entity_type, related_entity_id` | Source reconciliation | Keep |
| `budget_period` | `budget_period_key_unique` | `period_key` | One budget per month | Keep |
| `budget_period` | `budget_period_status_idx` | `status` | Budget workflow filtering | Keep |
| `budget_group` | `budget_group_period_idx` | `period_id` | Period groups | Keep |
| `budget_item` | `budget_item_group_idx` | `group_id` | Group items | Keep |
| `budget_revision` | `budget_revision_item_idx` | `budget_item_id` | Revision history | Keep |
| `realization_request` | `realization_item_status_idx` | `budget_item_id, status` | Allocation calculation | Keep |
| `realization_request` | `realization_status_idx` | `status` | Workflow queues | Keep |
| `realization_request` | `realization_correction_idx` | `corrects_realization_id` | Correction linkage | Keep |
| `realization_approval` | `realization_approval_realization_idx` | `realization_id` | Approval timeline | Keep |
| `realization_evidence` | `realization_evidence_realization_idx` | `realization_id` | Evidence list | Keep |
| `transaction_evidence` | `transaction_evidence_transaction_idx` | `transaction_id` | Transaction evidence list | Keep |
| `notification` | `notification_recipient_read_created_idx` | `recipient_user_id, read_at, created_at` | User unread/list query ordered by time | Keep; confirmed by EXPLAIN |
| `notification_dispatch` | `notification_dispatch_rule_target_recipient_unique` | `rule_key, target_key, recipient_user_id` | Idempotent dispatch | Keep |

No index should be removed solely from this document. Validate candidates with MySQL `EXPLAIN` first.
