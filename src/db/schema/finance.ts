import {
  bigint,
  boolean,
  check,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";

export const financialTransaction = mysqlTable(
  "financial_transaction",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    transactionCode: varchar("transaction_code", { length: 64 }).notNull(),
    transactionAt: timestamp("transaction_at").notNull(),
    transactionType: varchar("transaction_type", { length: 16 }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    description: text("description").notNull(),
    categoryId: varchar("category_id", { length: 36 }).references(() => financeCategory.id, { onDelete: "restrict" }),
    relatedEntityType: varchar("related_entity_type", { length: 64 }),
    relatedEntityId: varchar("related_entity_id", { length: 36 }),
    evidenceKey: varchar("evidence_key", { length: 255 }),
    status: varchar("status", { length: 16 }).notNull().default("DRAFT"),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    approvedBy: varchar("approved_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    reversedTransactionId: varchar("reversed_transaction_id", { length: 36 }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("financial_transaction_code_unique").on(table.transactionCode),
    index("financial_transaction_status_date_idx").on(table.status, table.transactionAt),
    index("financial_transaction_related_entity_idx").on(table.relatedEntityType, table.relatedEntityId),
    index("financial_transaction_category_date_idx").on(table.categoryId, table.transactionAt),
    check("financial_transaction_amount_range_check", sql`${table.amount} > 0 AND ${table.amount} <= 9007199254740991`),
  ],
);

export const financeCategory = mysqlTable(
  "finance_category",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    name: varchar("name", { length: 160 }).notNull(),
    transactionType: varchar("transaction_type", { length: 16 }).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("finance_category_type_name_unique").on(table.transactionType, table.name),
    index("finance_category_active_type_sort_idx").on(table.isActive, table.transactionType, table.sortOrder),
  ],
);
