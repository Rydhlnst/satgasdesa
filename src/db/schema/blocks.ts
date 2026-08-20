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
    workerCount: int("worker_count").notNull().default(0),
    operationalCondition: text("operational_condition").notNull(),
    startDate: date("start_date", { mode: "string" }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("block_code_idx").on(table.code),
    index("block_status_idx").on(table.status),
    check("block_latitude_range_check", sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check("block_longitude_range_check", sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`),
    check("block_worker_count_check", sql`${table.workerCount} >= 0`),
  ],
);
