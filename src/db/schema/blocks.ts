import {
  check,
  date,
  decimal,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

import { user } from "./auth";

export const block = mysqlTable(
  "block",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    status: varchar("status", { length: 16 }).notNull().default("NOT_OPERATING"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    locationPhotoKey: varchar("location_photo_key", { length: 255 }),
    managerName: varchar("manager_name", { length: 160 }),
    locationPicName: varchar("location_pic_name", { length: 160 }),
    fieldPicName: varchar("field_pic_name", { length: 160 }),
    contact: varchar("contact", { length: 64 }),
    areaHectares: decimal("area_hectares", { precision: 12, scale: 2 }),
    priority: varchar("priority", { length: 16 }).notNull().default("NORMAL"),
    workerCount: int("worker_count").notNull().default(0),
    operationalCondition: text("operational_condition").notNull(),
    startDate: date("start_date", { mode: "string" }),
    notes: text("notes"),
    archivedAt: timestamp("archived_at"),
    archivedBy: varchar("archived_by", { length: 36 }).references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("block_code_idx").on(table.code),
    index("block_status_idx").on(table.status),
    index("block_archive_status_idx").on(table.archivedAt, table.status),
    index("block_priority_idx").on(table.priority),
    check("block_latitude_range_check", sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check("block_longitude_range_check", sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`),
    check("block_worker_count_check", sql`${table.workerCount} >= 0`),
  ],
);

export const blockPhoto = mysqlTable(
  "block_photo",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    blockId: varchar("block_id", { length: 36 })
      .notNull()
      .references(() => block.id, { onDelete: "cascade" }),
    storageKey: varchar("storage_key", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: int("size_bytes").notNull(),
    caption: varchar("caption", { length: 255 }),
    createdBy: varchar("created_by", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("block_photo_block_created_idx").on(table.blockId, table.createdAt)],
);
