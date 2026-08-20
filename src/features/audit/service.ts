import { and, asc, count, desc, eq, like, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { user } from "@/src/db/schema/auth";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { AUDIT_ACTIONS } from "@/src/lib/audit";

const auditActions = Object.values(AUDIT_ACTIONS) as [string, ...string[]];

const auditFiltersSchema = z.object({
  query: z.string().trim().max(100).optional(),
  action: z.enum(auditActions).optional(),
  entityType: z.string().trim().max(100).optional(),
  actorUserId: z.string().trim().max(36).optional(),
  entityId: z.string().trim().max(36).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

function buildConditions(filters: z.infer<typeof auditFiltersSchema>) {
  const conditions = [];

  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(
      or(
        like(auditLog.entityType, pattern),
        like(auditLog.entityId, pattern),
        like(user.name, pattern),
        like(user.email, pattern),
      ),
    );
  }
  if (filters.action) conditions.push(eq(auditLog.action, filters.action));
  if (filters.entityType) conditions.push(eq(auditLog.entityType, filters.entityType));
  if (filters.actorUserId) conditions.push(eq(auditLog.actorUserId, filters.actorUserId));
  if (filters.entityId) conditions.push(eq(auditLog.entityId, filters.entityId));

  return conditions.length ? and(...conditions) : undefined;
}

export async function getAuditLogs(input?: unknown) {
  await requirePermission(PERMISSIONS.AUDIT_READ);
  const filters = auditFiltersSchema.parse(input ?? {});
  const conditions = buildConditions(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const database = getDb();

  const [rows, totalRows] = await Promise.all([
    database
      .select({
        id: auditLog.id,
        actorUserId: auditLog.actorUserId,
        actorName: user.name,
        actorEmail: user.email,
        action: auditLog.action,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        oldValues: auditLog.oldValues,
        newValues: auditLog.newValues,
        metadata: auditLog.metadata,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorUserId))
      .where(conditions)
      .orderBy(desc(auditLog.createdAt), asc(auditLog.id))
      .limit(filters.pageSize)
      .offset(offset),
    database
      .select({ value: count() })
      .from(auditLog)
      .leftJoin(user, eq(user.id, auditLog.actorUserId))
      .where(conditions),
  ]);

  const total = Number(totalRows[0]?.value ?? 0);
  return {
    rows,
    pagination: {
      page: filters.page,
      pageSize: filters.pageSize,
      total,
      totalPages: Math.ceil(total / filters.pageSize),
    },
  };
}

export async function getEntityAuditHistory(entityType: string, entityId: string) {
  await requirePermission(PERMISSIONS.AUDIT_READ);
  const parsedEntityType = z.string().trim().min(1).max(100).parse(entityType);
  const parsedEntityId = z.string().trim().min(1).max(36).parse(entityId);

  return getDb()
    .select({
      id: auditLog.id,
      actorUserId: auditLog.actorUserId,
      actorName: user.name,
      actorEmail: user.email,
      action: auditLog.action,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      oldValues: auditLog.oldValues,
      newValues: auditLog.newValues,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .leftJoin(user, eq(user.id, auditLog.actorUserId))
    .where(and(eq(auditLog.entityType, parsedEntityType), eq(auditLog.entityId, parsedEntityId)))
    .orderBy(desc(auditLog.createdAt), asc(auditLog.id));
}
