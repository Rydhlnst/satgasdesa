import { and, count, desc, eq, like, or } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { dailyInformation, dailyInformationAttachment, dailyInformationFollowUp } from "@/src/db/schema/daily-information";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { notifyPermissionHolders } from "@/src/features/notifications/service";
import { getObjectStorage } from "@/src/lib/storage";

import { DAILY_INFORMATION_TRANSITIONS, type DailyInformationStatus } from "./constants";
import { addDailyInformationAttachmentSchema, addDailyInformationFollowUpSchema, createDailyInformationSchema, dailyInformationAttachmentDownloadSchema, dailyInformationFiltersSchema, dailyInformationIdSchema, transitionDailyInformationSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the daily information details and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

async function assertBlockExists(id: string): Promise<void> {
  const [targetBlock] = await getDb().select({ id: block.id }).from(block).where(eq(block.id, id)).limit(1);
  if (!targetBlock) throw new Error("Block was not found.");
}

function attachmentScope(id: string): string {
  return `daily-information/${id}/`;
}

function assertAttachmentStorageKey(id: string, storageKey: string): void {
  const scope = attachmentScope(id);
  const suffix = storageKey.startsWith(scope) ? storageKey.slice(scope.length) : "";
  if (!suffix || suffix.includes("/") || suffix.includes("\\") || suffix.includes("..")) {
    throw new Error("Attachment key is outside the permitted information scope.");
  }
}

function parseFilters(input?: unknown) {
  return dailyInformationFiltersSchema.parse(typeof input === "string" ? { status: input } : input ?? {});
}

function buildFilterConditions(filters: ReturnType<typeof parseFilters>) {
  const conditions = [];
  if (filters.query) {
    const pattern = `%${filters.query}%`;
    conditions.push(or(like(dailyInformation.description, pattern), like(dailyInformation.documentation, pattern)));
  }
  if (filters.blockId) conditions.push(eq(dailyInformation.blockId, filters.blockId));
  if (filters.category) conditions.push(eq(dailyInformation.category, filters.category));
  if (filters.priority) conditions.push(eq(dailyInformation.priority, filters.priority));
  if (filters.status) conditions.push(eq(dailyInformation.status, filters.status));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getDailyInformation(input?: DailyInformationStatus | unknown) {
  await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const filters = parseFilters(input);
  const database = getDb();
  const query = database.select().from(dailyInformation);

  return buildFilterConditions(filters)
    ? query.where(buildFilterConditions(filters)).orderBy(desc(dailyInformation.reportedAt)).limit(100)
    : query.orderBy(desc(dailyInformation.reportedAt)).limit(100);
}

export async function getDailyInformationPage(input?: unknown) {
  await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const filters = parseFilters(input);
  const conditions = buildFilterConditions(filters);
  const offset = (filters.page - 1) * filters.pageSize;
  const database = getDb();
  const [rows, totalRows] = await Promise.all([
    database.select().from(dailyInformation).where(conditions).orderBy(desc(dailyInformation.reportedAt)).limit(filters.pageSize).offset(offset),
    database.select({ value: count() }).from(dailyInformation).where(conditions),
  ]);
  const total = Number(totalRows[0]?.value ?? 0);
  return { rows, pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function getDailyInformationItem(id: string) {
  await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const validId = parseInput(dailyInformationIdSchema.safeParse(id));
  const [item] = await getDb().select().from(dailyInformation).where(eq(dailyInformation.id, validId)).limit(1);
  if (!item) return null;
  const [followUps, attachments] = await Promise.all([
    getDb().select().from(dailyInformationFollowUp).where(eq(dailyInformationFollowUp.dailyInformationId, validId)).orderBy(dailyInformationFollowUp.createdAt),
    getDb().select().from(dailyInformationAttachment).where(eq(dailyInformationAttachment.dailyInformationId, validId)).orderBy(dailyInformationAttachment.createdAt),
  ]);
  return { item, followUps, attachments };
}

export async function addDailyInformationFollowUp(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_UPDATE);
  const values = parseInput(addDailyInformationFollowUpSchema.safeParse(input));
  const [item] = await getDb().select({ id: dailyInformation.id }).from(dailyInformation).where(eq(dailyInformation.id, values.id)).limit(1);
  if (!item) throw new Error("Daily information record was not found.");
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(dailyInformationFollowUp).values({ id, dailyInformationId: item.id, note: values.note, createdBy: session.user.id, createdAt: now });
    await tx.update(dailyInformation).set({ followUp: values.note, lastUpdatedBy: session.user.id, updatedAt: now }).where(eq(dailyInformation.id, item.id));
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "DAILY_INFORMATION", entityId: item.id, newValues: { followUpId: id } }));
  });
  return { id };
}

export async function addDailyInformationAttachment(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_UPDATE);
  const values = parseInput(addDailyInformationAttachmentSchema.safeParse(input));
  const [item] = await getDb().select({ id: dailyInformation.id }).from(dailyInformation).where(eq(dailyInformation.id, values.id)).limit(1);
  if (!item) throw new Error("Daily information record was not found.");
  assertAttachmentStorageKey(item.id, values.storageKey);
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(values.contentType)) {
    throw new Error("Unsupported attachment type.");
  }
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(dailyInformationAttachment).values({ id, dailyInformationId: item.id, storageKey: values.storageKey, contentType: values.contentType, sizeBytes: values.sizeBytes, createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "DAILY_INFORMATION", entityId: item.id, newValues: { attachmentId: id } }));
  });
  return { id };
}

export async function getDailyInformationAttachmentDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const values = parseInput(dailyInformationAttachmentDownloadSchema.safeParse(input));
  const [attachment] = await getDb()
    .select({ id: dailyInformationAttachment.id, storageKey: dailyInformationAttachment.storageKey })
    .from(dailyInformationAttachment)
    .where(and(eq(dailyInformationAttachment.dailyInformationId, values.id), eq(dailyInformationAttachment.storageKey, values.storageKey)))
    .limit(1);
  if (!attachment) throw new Error("Daily information attachment was not found.");
  assertAttachmentStorageKey(values.id, attachment.storageKey);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(attachment.storageKey) };
}

export async function createDailyInformation(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_CREATE);
  const values = parseInput(createDailyInformationSchema.safeParse(input));
  if (values.blockId) await assertBlockExists(values.blockId);

  const id = crypto.randomUUID();
  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(dailyInformation).values({
      id,
      blockId: values.blockId ?? null,
      reporterId: session.user.id,
      reportedAt: values.reportedAt ?? now,
      category: values.category,
      priority: values.priority,
      description: values.description,
      documentation: optionalValue(values.documentation),
      followUp: null,
      status: "NEW",
      lastUpdatedBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "DAILY_INFORMATION",
        entityId: id,
        newValues: { blockId: values.blockId ?? null, category: values.category, priority: values.priority, status: "NEW" },
      }),
    );
  });

  if (["HIGH", "URGENT"].includes(values.priority)) {
    await notifyPermissionHolders({ permission: PERMISSIONS.DAILY_INFO_UPDATE, ruleKey: "HIGH_PRIORITY_INFORMATION", targetKey: id, type: "HIGH_PRIORITY_INFORMATION", title: "High-priority daily information", body: `${values.priority} ${values.category.toLowerCase()} requires attention.`, relatedEntityType: "DAILY_INFORMATION", relatedEntityId: id });
  }

  return { id };
}

export async function transitionDailyInformation(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_UPDATE);
  const values = parseInput(transitionDailyInformationSchema.safeParse(input));
  const database = getDb();
  const [current] = await database
    .select()
    .from(dailyInformation)
    .where(eq(dailyInformation.id, values.id))
    .limit(1);
  if (!current) throw new Error("Daily information record was not found.");

  const allowed = DAILY_INFORMATION_TRANSITIONS[current.status as DailyInformationStatus] ?? [];
  if (!allowed.includes(values.status)) {
    throw new Error(`Cannot change daily information from ${current.status} to ${values.status}.`);
  }

  await database.transaction(async (tx) => {
    await tx
      .update(dailyInformation)
      .set({ status: values.status, followUp: values.followUp, lastUpdatedBy: session.user.id, updatedAt: new Date() })
      .where(eq(dailyInformation.id, current.id));

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        entityType: "DAILY_INFORMATION",
        entityId: current.id,
        oldValues: { status: current.status, followUp: current.followUp },
        newValues: { status: values.status, followUp: values.followUp },
      }),
    );
  });

  return { id: current.id, status: values.status };
}
