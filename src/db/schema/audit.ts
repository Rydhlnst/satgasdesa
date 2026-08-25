import { index, json, mysqlTable, timestamp, varchar } from "drizzle-orm/mysql-core";

export const auditLog = mysqlTable(
  "audit_log",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    action: varchar("action", { length: 32 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }).notNull(),
    entityId: varchar("entity_id", { length: 36 }),
    oldValues: json("old_values"),
    newValues: json("new_values"),
    metadata: json("metadata"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("audit_log_actor_user_id_idx").on(table.actorUserId),
    index("audit_log_actor_created_idx").on(table.actorUserId, table.createdAt),
    index("audit_log_entity_created_idx").on(table.entityType, table.entityId, table.createdAt),
    index("audit_log_created_at_idx").on(table.createdAt),
  ],
);
