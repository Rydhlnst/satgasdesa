import {
  index,
  mysqlTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  varchar,
  text,
} from "drizzle-orm/mysql-core";

import { user } from "./auth";

export const role = mysqlTable(
  "role",
  {
    id: varchar("id", { length: 64 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [uniqueIndex("role_name_unique").on(table.name)],
);

export const permission = mysqlTable(
  "permission",
  {
    id: varchar("id", { length: 100 }).primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [uniqueIndex("permission_name_unique").on(table.name)],
);

export const rolePermission = mysqlTable(
  "role_permission",
  {
    roleId: varchar("role_id", { length: 64 })
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permissionId: varchar("permission_id", { length: 100 })
      .notNull()
      .references(() => permission.id, { onDelete: "cascade" }),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permissionId] }),
    index("role_permission_permission_id_idx").on(table.permissionId),
  ],
);

export const userRole = mysqlTable(
  "user_role",
  {
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: varchar("role_id", { length: 64 })
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    assignedAt: timestamp("assigned_at").notNull(),
    assignedBy: varchar("assigned_by", { length: 36 }).references(() => user.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
    index("user_role_role_id_idx").on(table.roleId),
  ],
);
