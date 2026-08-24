import {
  check,
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
import { block } from "./blocks";

export const inspection = mysqlTable(
  "inspection",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    blockId: varchar("block_id", { length: 36 })
      .notNull()
      .references(() => block.id, { onDelete: "restrict" }),
    inspectorId: varchar("inspector_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    inspectedAt: timestamp("inspected_at").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
    longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
    gpsAccuracy: decimal("gps_accuracy", { precision: 10, scale: 2 }).notNull(),
    gpsCapturedAt: timestamp("gps_captured_at").notNull(),
    excavatorCount: int("excavator_count").notNull(),
    workerCount: int("worker_count").notNull(),
    condition: text("condition").notNull(),
    roadCondition: varchar("road_condition", { length: 64 }),
    environmentCondition: varchar("environment_condition", { length: 64 }),
    activityCondition: varchar("activity_condition", { length: 64 }),
    status: varchar("status", { length: 16 }).notNull().default("SUBMITTED"),
    findings: text("findings"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("inspection_block_inspected_idx").on(table.blockId, table.inspectedAt),
    index("inspection_inspector_inspected_idx").on(table.inspectorId, table.inspectedAt),
    index("inspection_status_inspected_idx").on(table.status, table.inspectedAt),
    check("inspection_latitude_range_check", sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check("inspection_longitude_range_check", sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`),
    check("inspection_gps_accuracy_check", sql`${table.gpsAccuracy} >= 0`),
    check("inspection_excavator_count_check", sql`${table.excavatorCount} >= 0`),
    check("inspection_worker_count_check", sql`${table.workerCount} >= 0`),
  ],
);

export const inspectionEvent = mysqlTable(
  "inspection_event",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    inspectionId: varchar("inspection_id", { length: 36 })
      .notNull()
      .references(() => inspection.id, { onDelete: "cascade" }),
    action: varchar("action", { length: 32 }).notNull(),
    notes: text("notes"),
    actorUserId: varchar("actor_user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [index("inspection_event_inspection_created_idx").on(table.inspectionId, table.createdAt)],
);

export const inspectionPhoto = mysqlTable(
  "inspection_photo",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    inspectionId: varchar("inspection_id", { length: 36 })
      .notNull()
      .references(() => inspection.id, { onDelete: "cascade" }),
    storageKey: varchar("storage_key", { length: 255 }).notNull(),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    sizeBytes: int("size_bytes").notNull(),
    capturedAt: timestamp("captured_at"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("inspection_photo_inspection_idx").on(table.inspectionId),
  ],
);
