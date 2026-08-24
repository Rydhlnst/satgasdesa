import {
  date,
  index,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

import { user } from "./auth";
import { businessActor } from "./business-actors";
import { block } from "./blocks";

export const excavator = mysqlTable(
  "excavator",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    unitCode: varchar("unit_code", { length: 64 }).notNull(),
    brand: varchar("brand", { length: 100 }).notNull(),
    model: varchar("model", { length: 100 }).notNull(),
    businessActorId: varchar("business_actor_id", { length: 36 }).references(() => businessActor.id, {
      onDelete: "restrict",
    }),
    operatorName: varchar("operator_name", { length: 160 }),
    currentBlockId: varchar("current_block_id", { length: 36 }).references(() => block.id, {
      onDelete: "set null",
    }),
    currentEntryDate: date("current_entry_date", { mode: "string" }),
    lastExitDate: date("last_exit_date", { mode: "string" }),
    status: varchar("status", { length: 16 }).notNull().default("INACTIVE"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("excavator_unit_code_unique").on(table.unitCode),
    index("excavator_current_block_idx").on(table.currentBlockId),
    index("excavator_business_actor_idx").on(table.businessActorId),
    index("excavator_status_idx").on(table.status),
  ],
);

export const excavatorMovement = mysqlTable(
  "excavator_movement",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    excavatorId: varchar("excavator_id", { length: 36 })
      .notNull()
      .references(() => excavator.id, { onDelete: "cascade" }),
    fromBlockId: varchar("from_block_id", { length: 36 }).references(() => block.id, {
      onDelete: "set null",
    }),
    toBlockId: varchar("to_block_id", { length: 36 }).references(() => block.id, {
      onDelete: "set null",
    }),
    movementType: varchar("movement_type", { length: 16 }).notNull(),
    occurredAt: timestamp("occurred_at").notNull(),
    notes: text("notes"),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("excavator_movement_excavator_occurred_idx").on(table.excavatorId, table.occurredAt),
    index("excavator_movement_to_block_idx").on(table.toBlockId),
  ],
);
