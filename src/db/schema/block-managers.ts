import {
  date,
  index,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { user } from "./auth";
import { block } from "./blocks";

export const blockManager = mysqlTable(
  "block_manager",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    blockId: varchar("block_id", { length: 36 })
      .notNull()
      .references(() => block.id, { onDelete: "cascade" }),
    assignmentRole: varchar("assignment_role", { length: 16 }).notNull(),
    personName: varchar("person_name", { length: 160 }).notNull(),
    contact: varchar("contact", { length: 64 }),
    startedAt: date("started_at", { mode: "string" }).notNull(),
    endedAt: date("ended_at", { mode: "string" }),
    notes: text("notes"),
    assignedBy: varchar("assigned_by", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("block_manager_block_role_ended_idx").on(table.blockId, table.assignmentRole, table.endedAt),
    index("block_manager_person_name_idx").on(table.personName),
  ],
);
