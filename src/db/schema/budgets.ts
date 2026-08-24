import { bigint, check, date, index, int, json, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";

export const budgetCategory = mysqlTable(
  "budget_category",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    isActive: int("is_active").notNull().default(1),
    sortOrder: int("sort_order").notNull().default(0),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("budget_category_name_unique").on(table.name),
    index("budget_category_active_sort_idx").on(table.isActive, table.sortOrder),
  ],
);

export const budgetSubcategory = mysqlTable(
  "budget_subcategory",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    categoryId: varchar("category_id", { length: 36 }).notNull().references(() => budgetCategory.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 160 }).notNull(),
    isActive: int("is_active").notNull().default(1),
    sortOrder: int("sort_order").notNull().default(0),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("budget_subcategory_category_name_unique").on(table.categoryId, table.name),
    index("budget_subcategory_category_active_sort_idx").on(table.categoryId, table.isActive, table.sortOrder),
  ],
);

export const budgetPeriod = mysqlTable(
  "budget_period",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    periodKey: varchar("period_key", { length: 7 }).notNull(),
    openingBalance: bigint("opening_balance", { mode: "number" }).notNull(),
    estimatedIncome: bigint("estimated_income", { mode: "number" }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("DRAFT"),
    approvalNotes: text("approval_notes"),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    approvedBy: varchar("approved_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [uniqueIndex("budget_period_key_unique").on(table.periodKey), index("budget_period_status_idx").on(table.status), check("budget_period_opening_balance_check", sql`${table.openingBalance} >= 0 AND ${table.openingBalance} <= 9007199254740991`), check("budget_period_estimated_income_check", sql`${table.estimatedIncome} >= 0 AND ${table.estimatedIncome} <= 9007199254740991`)],
);

export const budgetGroup = mysqlTable(
  "budget_group",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    periodId: varchar("period_id", { length: 36 }).notNull().references(() => budgetPeriod.id, { onDelete: "cascade" }),
    categoryId: varchar("category_id", { length: 36 }).references(() => budgetCategory.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    sortOrder: int("sort_order").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("budget_group_period_idx").on(table.periodId), index("budget_group_category_idx").on(table.categoryId)],
);

export const budgetItem = mysqlTable(
  "budget_item",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    groupId: varchar("group_id", { length: 36 }).notNull().references(() => budgetGroup.id, { onDelete: "cascade" }),
    subcategoryId: varchar("subcategory_id", { length: 36 }).references(() => budgetSubcategory.id, { onDelete: "restrict" }),
    name: varchar("name", { length: 255 }).notNull(),
    allocatedAmount: bigint("allocated_amount", { mode: "number" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("budget_item_group_idx").on(table.groupId), index("budget_item_subcategory_idx").on(table.subcategoryId), check("budget_item_allocated_amount_check", sql`${table.allocatedAmount} >= 0 AND ${table.allocatedAmount} <= 9007199254740991`)],
);

export const budgetItemAttachment = mysqlTable(
  "budget_item_attachment",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    budgetItemId: varchar("budget_item_id", { length: 36 }).notNull().references(() => budgetItem.id, { onDelete: "cascade" }),
    storageKey: varchar("storage_key", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: int("size_bytes").notNull(),
    caption: varchar("caption", { length: 255 }),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("budget_item_attachment_item_created_idx").on(table.budgetItemId, table.createdAt)],
);

export const budgetPeriodHistory = mysqlTable(
  "budget_period_history",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    periodId: varchar("period_id", { length: 36 }).notNull().references(() => budgetPeriod.id, { onDelete: "cascade" }),
    budgetItemId: varchar("budget_item_id", { length: 36 }).references(() => budgetItem.id, { onDelete: "set null" }),
    action: varchar("action", { length: 32 }).notNull(),
    notes: text("notes"),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("budget_period_history_period_created_idx").on(table.periodId, table.createdAt), index("budget_period_history_item_idx").on(table.budgetItemId)],
);

export const budgetRevision = mysqlTable(
  "budget_revision",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    budgetItemId: varchar("budget_item_id", { length: 36 }).notNull().references(() => budgetItem.id, { onDelete: "restrict" }),
    previousAmount: bigint("previous_amount", { mode: "number" }).notNull(),
    nextAmount: bigint("next_amount", { mode: "number" }).notNull(),
    reason: text("reason").notNull(),
    revisedBy: varchar("revised_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("budget_revision_item_idx").on(table.budgetItemId), check("budget_revision_previous_amount_check", sql`${table.previousAmount} >= 0 AND ${table.previousAmount} <= 9007199254740991`), check("budget_revision_next_amount_check", sql`${table.nextAmount} >= 0 AND ${table.nextAmount} <= 9007199254740991`)],
);

export const realizationRequest = mysqlTable(
  "realization_request",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    budgetItemId: varchar("budget_item_id", { length: 36 }).notNull().references(() => budgetItem.id, { onDelete: "restrict" }),
    requestedAmount: bigint("requested_amount", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    fundRequestId: varchar("fund_request_id", { length: 36 }),
    activity: varchar("activity", { length: 255 }),
    realizationDate: date("realization_date", { mode: "string" }),
    receiptNumber: varchar("receipt_number", { length: 100 }),
    evidenceKey: varchar("evidence_key", { length: 255 }),
    calculationSnapshot: json("calculation_snapshot"),
    correctsRealizationId: varchar("corrects_realization_id", { length: 36 }),
    correctionReason: text("correction_reason"),
    status: varchar("status", { length: 16 }).notNull().default("DRAFT"),
    isOverAllocation: int("is_over_allocation").notNull().default(0),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    verifiedBy: varchar("verified_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    approvedBy: varchar("approved_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    submittedAt: timestamp("submitted_at"),
    verifiedAt: timestamp("verified_at"),
    approvedAt: timestamp("approved_at"),
    reversedAt: timestamp("reversed_at"),
    reversedBy: varchar("reversed_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    reversalReason: text("reversal_reason"),
    reversalTransactionId: varchar("reversal_transaction_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("realization_item_status_idx").on(table.budgetItemId, table.status), index("realization_status_idx").on(table.status), index("realization_correction_idx").on(table.correctsRealizationId), index("realization_fund_request_idx").on(table.fundRequestId), index("realization_date_idx").on(table.realizationDate), check("realization_requested_amount_check", sql`${table.requestedAmount} > 0 AND ${table.requestedAmount} <= 9007199254740991`)],
);
