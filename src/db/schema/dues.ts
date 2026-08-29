import {
  bigint,
  check,
  date,
  index,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";
import { block } from "./blocks";
import { businessActor } from "./business-actors";
import { excavator, excavatorMovement } from "./excavators";

export const due = mysqlTable(
  "due",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    excavatorId: varchar("excavator_id", { length: 36 })
      .notNull()
      .references(() => excavator.id, { onDelete: "restrict" }),
    blockId: varchar("block_id", { length: 36 }).references(() => block.id, { onDelete: "restrict" }),
    businessActorId: varchar("business_actor_id", { length: 36 }).references(() => businessActor.id, { onDelete: "restrict" }),
    sourceMovementId: varchar("source_movement_id", { length: 36 }).references(() => excavatorMovement.id, {
      onDelete: "restrict",
    }),
    dueType: varchar("due_type", { length: 16 }).notNull(),
    referenceKey: varchar("reference_key", { length: 64 }).notNull(),
    payerName: varchar("payer_name", { length: 160 }).notNull(),
    amountDue: bigint("amount_due", { mode: "number" }).notNull(),
    amountPaid: bigint("amount_paid", { mode: "number" }).notNull().default(0),
    status: varchar("status", { length: 16 }).notNull().default("UNPAID"),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("due_excavator_type_reference_unique").on(table.excavatorId, table.dueType, table.referenceKey),
    uniqueIndex("due_source_movement_unique").on(table.sourceMovementId),
    index("due_status_due_date_idx").on(table.status, table.dueDate),
    index("due_block_reference_idx").on(table.blockId, table.referenceKey),
    index("due_actor_reference_idx").on(table.businessActorId, table.referenceKey),
    check("due_amount_due_range_check", sql`${table.amountDue} > 0 AND ${table.amountDue} <= 9007199254740991`),
    check("due_amount_paid_range_check", sql`${table.amountPaid} >= 0 AND ${table.amountPaid} <= ${table.amountDue}`),
  ],
);

export const duePayment = mysqlTable(
  "due_payment",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    dueId: varchar("due_id", { length: 36 })
      .notNull()
      .references(() => due.id, { onDelete: "restrict" }),
    payerName: varchar("payer_name", { length: 160 }).notNull(),
    paymentDate: date("payment_date", { mode: "string" }).notNull(),
    amount: bigint("amount", { mode: "number" }).notNull(),
    method: varchar("method", { length: 32 }).notNull(),
    evidenceKey: varchar("evidence_key", { length: 255 }),
    notes: text("notes"),
    status: varchar("status", { length: 16 }).notNull().default("PENDING"),
    confirmedBy: varchar("confirmed_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    confirmedAt: timestamp("confirmed_at"),
    rejectedBy: varchar("rejected_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    rejectedAt: timestamp("rejected_at"),
    rejectionReason: text("rejection_reason"),
    financialTransactionId: varchar("financial_transaction_id", { length: 36 }),
    recordedBy: varchar("recorded_by", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("due_payment_due_date_idx").on(table.dueId, table.paymentDate),
    index("due_payment_status_created_idx").on(table.status, table.createdAt),
    check("due_payment_amount_range_check", sql`${table.amount} > 0 AND ${table.amount} <= 9007199254740991`),
  ],
);
