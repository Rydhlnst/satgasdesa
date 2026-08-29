import { index, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";
import { user } from "./auth";

export const notification = mysqlTable("notification", {
  id: varchar("id", { length: 36 }).primaryKey(),
  recipientUserId: varchar("recipient_user_id", { length: 36 }).notNull().references(() => user.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 64 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body").notNull(),
  relatedEntityType: varchar("related_entity_type", { length: 64 }),
  relatedEntityId: varchar("related_entity_id", { length: 36 }),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull(),
}, (table) => [index("notification_recipient_read_created_idx").on(table.recipientUserId, table.readAt, table.createdAt)]);

export const notificationDispatch = mysqlTable("notification_dispatch", {
  id: varchar("id", { length: 36 }).primaryKey(),
  ruleKey: varchar("rule_key", { length: 64 }).notNull(),
  targetKey: varchar("target_key", { length: 128 }).notNull(),
  recipientUserId: varchar("recipient_user_id", { length: 36 }).notNull().references(() => user.id, { onDelete: "cascade" }),
  notificationId: varchar("notification_id", { length: 36 }).notNull().references(() => notification.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull(),
}, (table) => [uniqueIndex("notification_dispatch_rule_target_recipient_unique").on(table.ruleKey, table.targetKey, table.recipientUserId)]);

export const pushDevice = mysqlTable("push_device", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => user.id, { onDelete: "cascade" }),
  expoPushToken: varchar("expo_push_token", { length: 255 }).notNull(),
  platform: varchar("platform", { length: 16 }).notNull(),
  lastSeenAt: timestamp("last_seen_at").notNull(),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
}, (table) => [
  uniqueIndex("push_device_expo_token_unique").on(table.expoPushToken),
  index("push_device_user_seen_idx").on(table.userId, table.lastSeenAt),
]);

export const notificationDelivery = mysqlTable("notification_delivery", {
  id: varchar("id", { length: 36 }).primaryKey(),
  notificationId: varchar("notification_id", { length: 36 }).notNull().references(() => notification.id, { onDelete: "cascade" }),
  pushDeviceId: varchar("push_device_id", { length: 36 }),
  status: varchar("status", { length: 32 }).notNull(),
  providerTicketId: varchar("provider_ticket_id", { length: 255 }),
  errorCode: varchar("error_code", { length: 128 }),
  attemptedAt: timestamp("attempted_at").notNull(),
}, (table) => [index("notification_delivery_notification_idx").on(table.notificationId, table.attemptedAt), index("notification_delivery_device_idx").on(table.pushDeviceId, table.attemptedAt)]);
