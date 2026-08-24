import { bigint, check, date, foreignKey, index, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";
import { block } from "./blocks";
import { budgetCategory, budgetPeriod, budgetSubcategory } from "./budgets";

export const fundRequest = mysqlTable(
  "fund_request",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    requestNumber: varchar("request_number", { length: 32 }).notNull(),
    budgetPeriodId: varchar("budget_period_id", { length: 36 }).notNull().references(() => budgetPeriod.id, { onDelete: "restrict" }),
    budgetCategoryId: varchar("budget_category_id", { length: 36 }).notNull().references(() => budgetCategory.id, { onDelete: "restrict" }),
    budgetSubcategoryId: varchar("budget_subcategory_id", { length: 36 }).references(() => budgetSubcategory.id, { onDelete: "restrict" }),
    blockId: varchar("block_id", { length: 36 }).references(() => block.id, { onDelete: "restrict" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    requestedAt: date("requested_at", { mode: "string" }).notNull(),
    status: varchar("status", { length: 24 }).notNull().default("DRAFT"),
    revisionOfId: varchar("revision_of_id", { length: 36 }),
    correctionReason: text("correction_reason"),
    cancellationReason: text("cancellation_reason"),
    submittedAt: timestamp("submitted_at"),
    verifiedAt: timestamp("verified_at"),
    approvedAt: timestamp("approved_at"),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    verifiedBy: varchar("verified_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    approvedBy: varchar("approved_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("fund_request_number_unique").on(table.requestNumber),
    index("fund_request_period_status_created_idx").on(table.budgetPeriodId, table.status, table.createdAt),
    index("fund_request_category_status_idx").on(table.budgetCategoryId, table.status),
    index("fund_request_block_status_idx").on(table.blockId, table.status),
    index("fund_request_created_by_status_idx").on(table.createdBy, table.status),
    index("fund_request_revision_of_idx").on(table.revisionOfId),
    foreignKey({ columns: [table.revisionOfId], foreignColumns: [table.id], name: "fund_request_revision_of_id_fund_request_id_fk" }).onDelete("set null"),
    check("fund_request_amount_range_check", sql`${table.amount} > 0 AND ${table.amount} <= 9007199254740991`),
  ],
);

export const fundRequestAttachment = mysqlTable(
  "fund_request_attachment",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    fundRequestId: varchar("fund_request_id", { length: 36 }).notNull().references(() => fundRequest.id, { onDelete: "cascade" }),
    storageKey: varchar("storage_key", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    caption: varchar("caption", { length: 255 }),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("fund_request_attachment_request_created_idx").on(table.fundRequestId, table.createdAt)],
);

export const fundRequestEvent = mysqlTable(
  "fund_request_event",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    fundRequestId: varchar("fund_request_id", { length: 36 }).notNull().references(() => fundRequest.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 32 }).notNull(),
    notes: text("notes"),
    actorUserId: varchar("actor_user_id", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("fund_request_event_request_created_idx").on(table.fundRequestId, table.createdAt)],
);
