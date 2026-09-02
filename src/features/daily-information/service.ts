import { and, asc, count, desc, eq, gte, inArray, like, lt, lte, or } from "drizzle-orm";
import { getDb } from "@/src/db";
import { nextJakartaDay, startOfJakartaDay } from "@/src/lib/date-range";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { dailyInformation, dailyInformationAttachment, dailyInformationFollowUp } from "@/src/db/schema/daily-information";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { hasPermission, requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { requireAssignedBlockAccess } from "@/src/features/field-operations/service";
import { notifyBusinessActorUsersForBlock, notifyPermissionHolders } from "@/src/features/notifications/service";
import { getObjectStorage, validateUpload } from "@/src/lib/storage";
import { parseValidatedInput } from "@/src/lib/validation";

import { DAILY_INFORMATION_TRANSITIONS, type DailyInformationStatus } from "./constants";
import { addDailyInformationAttachmentSchema, addDailyInformationFollowUpSchema, createDailyInformationSchema, dailyInformationAttachmentDownloadSchema, dailyInformationAttachmentUploadSchema, dailyInformationFiltersSchema, dailyInformationIdSchema, transitionDailyInformationSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T; error?: unknown }): T {
  return parseValidatedInput(result, "Please check the daily information details and try again.");
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

function forbidden(message: string): never {
  const error = new Error(message);
  Object.assign(error, { code: "FORBIDDEN", status: 403 });
  throw error;
}

async function isFieldOfficer(userId: string): Promise<boolean> {
  return (await hasPermission(userId, PERMISSIONS.PAYMENT_FIELD_VERIFY)) && !(await hasPermission(userId, PERMISSIONS.FIELD_ASSIGNMENT_MANAGE));
}

async function assertInformationScope(item: { reporterId: string; blockId: string | null }, userId: string): Promise<void> {
  if (!await isFieldOfficer(userId)) return;
  if (item.reporterId !== userId) forbidden("You can only access information that you reported.");
  if (item.blockId) await requireAssignedBlockAccess(item.blockId);
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
  if (filters.reportedDate) {
    const start = new Date(`${filters.reportedDate}T00:00:00.000+07:00`);
    const end = new Date(`${filters.reportedDate}T23:59:59.999+07:00`);
    conditions.push(gte(dailyInformation.reportedAt, start), lte(dailyInformation.reportedAt, end));
  }
  if (filters.dateFrom) conditions.push(gte(dailyInformation.reportedAt, startOfJakartaDay(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lt(dailyInformation.reportedAt, nextJakartaDay(filters.dateTo)));
  return conditions.length ? and(...conditions) : undefined;
}

export async function getDailyInformation(input?: DailyInformationStatus | unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const filters = parseFilters(input);
  const database = getDb();
  const query = database.select().from(dailyInformation);
  const filter = buildFilterConditions(filters);
  const scope = await isFieldOfficer(session.user.id) ? eq(dailyInformation.reporterId, session.user.id) : undefined;
  const conditions = filter && scope ? and(filter, scope) : filter ?? scope;

  return conditions
    ? query.where(conditions).orderBy(desc(dailyInformation.reportedAt)).limit(100)
    : query.orderBy(desc(dailyInformation.reportedAt)).limit(100);
}

export async function getDailyInformationPage(input?: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const filters = parseFilters(input);
  const baseConditions = buildFilterConditions(filters);
  const scope = filters.mine || await isFieldOfficer(session.user.id) ? eq(dailyInformation.reporterId, session.user.id) : undefined;
  const conditions = baseConditions && scope ? and(baseConditions, scope) : baseConditions ?? scope;
  const offset = (filters.page - 1) * filters.pageSize;
  const database = getDb();
  const [rows, totalRows] = await Promise.all([
    database.select().from(dailyInformation).where(conditions).orderBy(desc(dailyInformation.reportedAt)).limit(filters.pageSize).offset(offset),
    database.select({ value: count() }).from(dailyInformation).where(conditions),
  ]);
  const total = Number(totalRows[0]?.value ?? 0);
  const attachments = rows.length ? await database.select({ dailyInformationId: dailyInformationAttachment.dailyInformationId, storageKey: dailyInformationAttachment.storageKey, contentType: dailyInformationAttachment.contentType }).from(dailyInformationAttachment).where(inArray(dailyInformationAttachment.dailyInformationId, rows.map((row) => row.id))).orderBy(asc(dailyInformationAttachment.createdAt)) : [];
  const firstAttachment = new Map<string, { storageKey: string; contentType: string }>();
  for (const attachment of attachments) if (!firstAttachment.has(attachment.dailyInformationId)) firstAttachment.set(attachment.dailyInformationId, attachment);
  return { rows: rows.map((row) => ({ ...row, coverPhotoKey: firstAttachment.get(row.id)?.storageKey ?? null, coverPhotoContentType: firstAttachment.get(row.id)?.contentType ?? null })), pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.ceil(total / filters.pageSize) } };
}

export async function getDailyInformationItem(id: string) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const validId = parseInput(dailyInformationIdSchema.safeParse(id));
  const [item] = await getDb().select().from(dailyInformation).where(eq(dailyInformation.id, validId)).limit(1);
  if (!item) return null;
  await assertInformationScope(item, session.user.id);
  const [followUps, attachments] = await Promise.all([
    getDb().select().from(dailyInformationFollowUp).where(eq(dailyInformationFollowUp.dailyInformationId, validId)).orderBy(dailyInformationFollowUp.createdAt),
    getDb().select().from(dailyInformationAttachment).where(eq(dailyInformationAttachment.dailyInformationId, validId)).orderBy(dailyInformationAttachment.createdAt),
  ]);
  return { item, followUps, attachments };
}

export async function addDailyInformationFollowUp(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_UPDATE);
  const values = parseInput(addDailyInformationFollowUpSchema.safeParse(input));
  const [item] = await getDb().select().from(dailyInformation).where(eq(dailyInformation.id, values.id)).limit(1);
  if (!item) throw new Error("Daily information record was not found.");
  await assertInformationScope(item, session.user.id);
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
  const [item] = await getDb().select().from(dailyInformation).where(eq(dailyInformation.id, values.id)).limit(1);
  if (!item) throw new Error("Daily information record was not found.");
  await assertInformationScope(item, session.user.id);
  assertAttachmentStorageKey(item.id, values.storageKey);
  if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(values.contentType)) {
    throw new Error("Unsupported attachment type.");
  }
  await getObjectStorage().verifyObject(values.storageKey, { contentType: values.contentType, size: values.sizeBytes, originalName: values.storageKey.split("/").at(-1) ?? "attachment" });
  const id = crypto.randomUUID(); const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.insert(dailyInformationAttachment).values({ id, dailyInformationId: item.id, storageKey: values.storageKey, contentType: values.contentType, sizeBytes: values.sizeBytes, createdBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "DAILY_INFORMATION", entityId: item.id, newValues: { attachmentId: id } }));
  });
  return { id };
}

export async function createDailyInformationAttachmentUploadUrl(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_CREATE);
  const values = dailyInformationAttachmentUploadSchema.parse(input);
  validateUpload({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName });
  const [existing] = await getDb().select().from(dailyInformation).where(eq(dailyInformation.id, values.id)).limit(1);
  if (existing) await assertInformationScope(existing, session.user.id);
  const scope = attachmentScope(values.id);
  const upload = await getObjectStorage().createUploadUrl({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName, scope });
  assertAttachmentStorageKey(values.id, upload.key);
  return { id: values.id, key: upload.key, uploadUrl: upload.uploadUrl, contentType: values.contentType, sizeBytes: values.sizeBytes };
}

export async function getDailyInformationAttachmentDownloadUrl(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_READ);
  const values = parseInput(dailyInformationAttachmentDownloadSchema.safeParse(input));
  const [attachment] = await getDb()
    .select({ id: dailyInformationAttachment.id, storageKey: dailyInformationAttachment.storageKey })
    .from(dailyInformationAttachment)
    .where(and(eq(dailyInformationAttachment.dailyInformationId, values.id), eq(dailyInformationAttachment.storageKey, values.storageKey)))
    .limit(1);
  if (!attachment) throw new Error("Daily information attachment was not found.");
  assertAttachmentStorageKey(values.id, attachment.storageKey);
  const [item] = await getDb().select().from(dailyInformation).where(eq(dailyInformation.id, values.id)).limit(1);
  if (!item) throw new Error("Daily information record was not found.");
  await assertInformationScope(item, session.user.id);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(attachment.storageKey) };
}

export async function createDailyInformation(input: unknown) {
  const session = await requirePermission(PERMISSIONS.DAILY_INFO_CREATE);
  const values = parseInput(createDailyInformationSchema.safeParse(input));
  if (values.blockId) { await assertBlockExists(values.blockId); await requireAssignedBlockAccess(values.blockId); }

  const id = values.id ?? crypto.randomUUID();
  const now = new Date();
  const [existing] = await getDb().select({ id: dailyInformation.id, reporterId: dailyInformation.reporterId }).from(dailyInformation).where(eq(dailyInformation.id, id)).limit(1);
  if (existing) {
    if (existing.reporterId !== session.user.id) throw new Error("This information idempotency key belongs to another user.");
    return { id, duplicate: true };
  }
  for (const attachment of values.attachments) {
    assertAttachmentStorageKey(id, attachment.storageKey);
    if (!["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(attachment.contentType)) throw new Error("Unsupported attachment type.");
  }
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
      latitude: values.latitude?.toFixed(7) ?? null,
      longitude: values.longitude?.toFixed(7) ?? null,
      gpsAccuracy: values.gpsAccuracy?.toFixed(2) ?? null,
      gpsCapturedAt: values.gpsCapturedAt ?? null,
      followUp: null,
      status: "NEW",
      lastUpdatedBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    });

    if (values.attachments.length) {
      await tx.insert(dailyInformationAttachment).values(values.attachments.map((attachment) => ({ id: crypto.randomUUID(), dailyInformationId: id, storageKey: attachment.storageKey, contentType: attachment.contentType, sizeBytes: attachment.sizeBytes, createdBy: session.user.id, createdAt: now })));
    }

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "DAILY_INFORMATION",
        entityId: id,
        newValues: { blockId: values.blockId ?? null, category: values.category, priority: values.priority, status: "NEW", attachmentCount: values.attachments.length, hasGps: values.latitude !== undefined },
      }),
    );
  });

  await notifyPermissionHolders({ permission: PERMISSIONS.DAILY_INFO_READ, ruleKey: "DAILY_INFORMATION_CREATED", targetKey: id, type: "DAILY_INFORMATION", title: values.priority === "URGENT" || values.priority === "HIGH" ? "Informasi lapangan mendesak" : "Informasi lapangan baru", body: `${values.category} telah dikirim untuk ditinjau.`, relatedEntityType: "DAILY_INFORMATION", relatedEntityId: id });
  if (values.blockId) await notifyBusinessActorUsersForBlock(values.blockId, { ruleKey: "DAILY_INFORMATION_CREATED_PORTAL", targetKey: id, type: "DAILY_INFORMATION", title: values.priority === "URGENT" || values.priority === "HIGH" ? "Informasi lapangan mendesak" : "Informasi lapangan baru", body: `${values.category} terkait dengan blok usaha Anda.`, relatedEntityType: "DAILY_INFORMATION", relatedEntityId: id });

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
  await assertInformationScope(current, session.user.id);

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
