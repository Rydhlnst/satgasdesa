import { date, index, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

import { user } from "./auth";
import { block } from "./blocks";

export const fieldWorker = mysqlTable(
  "field_worker",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    fullName: varchar("full_name", { length: 160 }).notNull(),
    phone: varchar("phone", { length: 64 }),
    position: varchar("position", { length: 160 }),
    photoKey: varchar("photo_key", { length: 255 }),
    status: varchar("status", { length: 16 }).notNull().default("ACTIVE"),
    notes: text("notes"),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [index("field_worker_status_name_idx").on(table.status, table.fullName)],
);

export const workerBlockAssignment = mysqlTable(
  "worker_block_assignment",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    workerId: varchar("worker_id", { length: 36 }).notNull().references(() => fieldWorker.id, { onDelete: "restrict" }),
    blockId: varchar("block_id", { length: 36 }).notNull().references(() => block.id, { onDelete: "restrict" }),
    startedAt: date("started_at", { mode: "string" }).notNull(),
    endedAt: date("ended_at", { mode: "string" }),
    notes: text("notes"),
    assignedBy: varchar("assigned_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("worker_block_assignment_worker_active_idx").on(table.workerId, table.endedAt),
    index("worker_block_assignment_block_active_idx").on(table.blockId, table.endedAt),
  ],
);

export const fieldTask = mysqlTable(
  "field_task",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    blockId: varchar("block_id", { length: 36 }).notNull().references(() => block.id, { onDelete: "restrict" }),
    assignedFieldOfficerId: varchar("assigned_field_officer_id", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    assignedWorkerId: varchar("assigned_worker_id", { length: 36 }).references(() => fieldWorker.id, { onDelete: "set null" }),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    priority: varchar("priority", { length: 16 }).notNull().default("MEDIUM"),
    status: varchar("status", { length: 16 }).notNull().default("TODO"),
    dueDate: date("due_date", { mode: "string" }),
    completedAt: timestamp("completed_at"),
    createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    updatedBy: varchar("updated_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("field_task_block_status_due_idx").on(table.blockId, table.status, table.dueDate),
    index("field_task_officer_status_due_idx").on(table.assignedFieldOfficerId, table.status, table.dueDate),
    index("field_task_worker_status_idx").on(table.assignedWorkerId, table.status),
  ],
);
