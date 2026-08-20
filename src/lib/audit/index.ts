import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";

export const AUDIT_ACTIONS = {
  CREATE: "CREATE",
  UPDATE: "UPDATE",
  SUBMIT: "SUBMIT",
  VERIFY: "VERIFY",
  APPROVE: "APPROVE",
  REJECT: "REJECT",
  CORRECT: "CORRECT",
  REVERSE: "REVERSE",
  STATUS_CHANGE: "STATUS_CHANGE",
  LOGIN: "LOGIN",
  EXPORT: "EXPORT",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

export type AuditEventInput = {
  actorUserId?: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
};

export function createAuditLogValues(input: AuditEventInput): typeof auditLog.$inferInsert {
  return {
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    oldValues: input.oldValues,
    newValues: input.newValues,
    metadata: input.metadata,
    createdAt: new Date(),
  };
}

export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
  await getDb().insert(auditLog).values(createAuditLogValues(input));
}
