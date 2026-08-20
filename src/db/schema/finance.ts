import {
  bigint,
  check,
  index,
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
    check("financial_transaction_amount_range_check", sql`${table.amount} > 0 AND ${table.amount} <= 9007199254740991`),
  ],
);
