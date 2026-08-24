import {
  date,
  decimal,
  index,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

import { user } from "./auth";
import { block } from "./blocks";
import { duePayment } from "./dues";

export const businessActor = mysqlTable(
  "business_actor",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorType: varchar("actor_type", { length: 16 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    representativeName: varchar("representative_name", { length: 160 }),
    contact: varchar("contact", { length: 64 }),
    address: text("address"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (table) => [
    index("business_actor_name_idx").on(table.name),
    index("business_actor_contact_idx").on(table.contact),
  ],
);

export const blockFieldAssignment = mysqlTable(
  "block_field_assignment",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    blockId: varchar("block_id", { length: 36 })
      .notNull()
      .references(() => block.id, { onDelete: "restrict" }),
    fieldOfficerId: varchar("field_officer_id", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
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
    index("block_field_assignment_officer_active_idx").on(table.fieldOfficerId, table.endedAt),
    index("block_field_assignment_block_active_idx").on(table.blockId, table.endedAt),
  ],
);

export const duePaymentVerification = mysqlTable(
  "due_payment_verification",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    duePaymentId: varchar("due_payment_id", { length: 36 })
      .notNull()
      .references(() => duePayment.id, { onDelete: "restrict" }),
    verifiedBy: varchar("verified_by", { length: 36 })
      .notNull()
      .references(() => user.id, { onDelete: "restrict" }),
    verificationStatus: varchar("verification_status", { length: 16 }).notNull(),
    verifiedAt: timestamp("verified_at").notNull(),
    latitude: decimal("latitude", { precision: 10, scale: 7 }),
    longitude: decimal("longitude", { precision: 10, scale: 7 }),
    gpsAccuracy: decimal("gps_accuracy", { precision: 10, scale: 2 }),
    evidenceKey: varchar("evidence_key", { length: 255 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull(),
  },
  (table) => [
    index("due_payment_verification_payment_verified_idx").on(table.duePaymentId, table.verifiedAt),
    index("due_payment_verification_officer_verified_idx").on(table.verifiedBy, table.verifiedAt),
  ],
);
