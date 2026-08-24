import {
  decimal,
  index,
  int,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { user } from "./auth";
import { block } from "./blocks";

export const dailyInformation = mysqlTable(
  "daily_information",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    blockId: varchar("block_id", { length: 36 }).references(() => block.id, { onDelete: "set null" }),
    reporterId: varchar("reporter_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    reportedAt: timestamp("reported_at").notNull(),
    category: varchar("category", { length: 32 }).notNull(),
    priority: varchar("priority", { length: 16 }).notNull(),
    description: text("description").notNull(),
    documentation: text("documentation"),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    gpsAccuracy: decimal("gps_accuracy", { precision: 10, scale: 2 }),
    gpsCapturedAt: timestamp("gps_captured_at"),
    followUp: text("follow_up"),
    status: varchar("status", { length: 16 }).notNull().default("NEW"),
    lastUpdatedBy: varchar("last_updated_by", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("daily_information_status_reported_idx").on(table.status, table.reportedAt),
    index("daily_information_block_reported_idx").on(table.blockId, table.reportedAt),
    index("daily_information_priority_reported_idx").on(table.priority, table.reportedAt),
    index("daily_information_reporter_reported_idx").on(table.reporterId, table.reportedAt),
  ],
);

export const dailyInformationFollowUp = mysqlTable("daily_information_followup", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dailyInformationId: varchar("daily_information_id", { length: 36 }).notNull().references(() => dailyInformation.id, { onDelete: "cascade" }),
  note: text("note").notNull(),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull(),
}, (table) => [index("daily_information_followup_information_idx").on(table.dailyInformationId, table.createdAt)]);

export const dailyInformationAttachment = mysqlTable("daily_information_attachment", {
  id: varchar("id", { length: 36 }).primaryKey(),
  dailyInformationId: varchar("daily_information_id", { length: 36 }).notNull().references(() => dailyInformation.id, { onDelete: "cascade" }),
  storageKey: varchar("storage_key", { length: 255 }).notNull(),
  contentType: varchar("content_type", { length: 100 }).notNull(),
  sizeBytes: int("size_bytes").notNull(),
  createdBy: varchar("created_by", { length: 36 }).notNull().references(() => user.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull(),
}, (table) => [index("daily_information_attachment_information_idx").on(table.dailyInformationId)]);
