import { bigint, check, index, int, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";

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
    name: varchar("name", { length: 255 }).notNull(),
    sortOrder: int("sort_order").notNull(),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("budget_group_period_idx").on(table.periodId)],
);

export const budgetItem = mysqlTable(
  "budget_item",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    groupId: varchar("group_id", { length: 36 }).notNull().references(() => budgetGroup.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    allocatedAmount: bigint("allocated_amount", { mode: "number" }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("budget_item_group_idx").on(table.groupId), check("budget_item_allocated_amount_check", sql`${table.allocatedAmount} >= 0 AND ${table.allocatedAmount} <= 9007199254740991`)],
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
    evidenceKey: varchar("evidence_key", { length: 255 }),
    correctsRealizationId: varchar("corrects_realization_id", { length: 36 }),
    correctionReason: text("correction_reason"),
    status: varchar("status", { length: 16 }).notNull().default("DRAFT"),
    isOverAllocation: int("is_over_allocation").notNull().default(0),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    verifiedBy: varchar("verified_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    approvedBy: varchar("approved_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("realization_item_status_idx").on(table.budgetItemId, table.status), index("realization_status_idx").on(table.status), index("realization_correction_idx").on(table.correctsRealizationId), check("realization_requested_amount_check", sql`${table.requestedAmount} > 0 AND ${table.requestedAmount} <= 9007199254740991`)],
);
