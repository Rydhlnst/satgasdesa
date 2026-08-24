import { json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const appSetting = mysqlTable("app_setting", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").notNull(),
  updatedBy: varchar("updated_by", { length: 36 }),
  createdAt: timestamp("created_at").notNull(),
  updatedAt: timestamp("updated_at").notNull(),
});
