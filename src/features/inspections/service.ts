import { and, desc, eq, gte, inArray, like, lt, or } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { inspection, inspectionEvent, inspectionPhoto } from "@/src/db/schema/inspections";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateImageUpload } from "@/src/lib/storage";
import { getAssignedBlockIdsForCurrentUser, requireAssignedBlockAccess } from "@/src/features/field-operations/service";
import { notifyPermissionHolders } from "@/src/features/notifications/service";

import { createInspectionSchema, inspectionFiltersSchema, inspectionIdSchema, inspectionPhotoDownloadSchema, inspectionUploadSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the inspection details and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

function inspectionScope(inspectionId: string): string {
  return `inspections/${inspectionId}`;
}

function startOfJakartaDay(value: string): Date {
  return new Date(`${value}T00:00:00.000+07:00`);
}

function nextJakartaDay(value: string): Date {
  const date = startOfJakartaDay(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function assertInspectionPhotoKey(inspectionId: string, storageKey: string): void {
  const scope = `${inspectionScope(inspectionId)}/`;
  const suffix = storageKey.startsWith(scope) ? storageKey.slice(scope.length) : "";
  if (!suffix || suffix.includes("/") || suffix.includes("\\") || suffix.includes("..")) {
    throw new Error("Inspection photo key is outside the permitted storage scope.");
  }
}

async function assertBlockExists(id: string): Promise<void> {
  const [targetBlock] = await getDb().select({ id: block.id }).from(block).where(eq(block.id, id)).limit(1);
  if (!targetBlock) throw new Error("Block was not found.");
}

export async function createInspectionUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.INSPECTION_CREATE);
  const values = parseInput(inspectionUploadSchema.safeParse(input));
  validateImageUpload(values);

  const storage = getObjectStorage();
  const scope = inspectionScope(values.inspectionId);
  const upload = await storage.createUploadUrl({ ...values, scope });
  if (!upload.key.startsWith(`${scope}/`)) {
    throw new Error("Storage provider returned an invalid inspection upload key.");
  }

  return { inspectionId: values.inspectionId, key: upload.key, uploadUrl: upload.uploadUrl };
}

export async function getInspections(input?: string | unknown) {
  const session = await requirePermission(PERMISSIONS.INSPECTION_READ);
  const filters = inspectionFiltersSchema.parse(typeof input === "string" ? { blockId: input } : input ?? {});
  const conditions = [];
  if (filters.blockId) conditions.push(eq(inspection.blockId, filters.blockId));
  if (filters.status) conditions.push(eq(inspection.status, filters.status));
  if (filters.mine) conditions.push(eq(inspection.inspectorId, session.user.id));
  if (filters.query) conditions.push(or(like(block.code, `%${filters.query}%`), like(block.name, `%${filters.query}%`)));
  if (filters.dateFrom) conditions.push(gte(inspection.inspectedAt, startOfJakartaDay(filters.dateFrom)));
  if (filters.dateTo) conditions.push(lt(inspection.inspectedAt, nextJakartaDay(filters.dateTo)));
  const assignedBlockIds = await getAssignedBlockIdsForCurrentUser();
  if (assignedBlockIds) {
    if (!assignedBlockIds.length) return [];
    conditions.push(inArray(inspection.blockId, assignedBlockIds));
  }
  const query = getDb()
    .select({
      id: inspection.id,
      blockId: inspection.blockId,
      blockCode: block.code,
      blockName: block.name,
      inspectorId: inspection.inspectorId,
      inspectedAt: inspection.inspectedAt,
      condition: inspection.condition,
      roadCondition: inspection.roadCondition,
      environmentCondition: inspection.environmentCondition,
      activityCondition: inspection.activityCondition,
      status: inspection.status,
      excavatorCount: inspection.excavatorCount,
      workerCount: inspection.workerCount,
    })
    .from(inspection)
    .innerJoin(block, eq(block.id, inspection.blockId));

  return conditions.length
    ? query.where(and(...conditions)).orderBy(desc(inspection.inspectedAt)).limit(100)
    : query.orderBy(desc(inspection.inspectedAt)).limit(100);
}

export async function getInspection(id: string) {
  await requirePermission(PERMISSIONS.INSPECTION_READ);
  const validId = parseInput(inspectionIdSchema.safeParse(id));
  const [item] = await getDb().select().from(inspection).where(eq(inspection.id, validId)).limit(1);
  if (!item) return null;
  await requireAssignedBlockAccess(item.blockId);

  const [photos, events] = await Promise.all([
    getDb().select().from(inspectionPhoto).where(eq(inspectionPhoto.inspectionId, validId)).orderBy(inspectionPhoto.createdAt),
    getDb().select().from(inspectionEvent).where(eq(inspectionEvent.inspectionId, validId)).orderBy(desc(inspectionEvent.createdAt)),
  ]);

  return { item, photos, events };
}

async function saveInspection(input: unknown, status: "DRAFT" | "SUBMITTED") {
  const session = await requirePermission(PERMISSIONS.INSPECTION_CREATE);
  const values = parseInput(createInspectionSchema.safeParse(input));
  const id = values.id ?? crypto.randomUUID();
  const now = new Date();
  const inspectedAt = values.inspectedAt ?? now;
  const gpsCapturedAt = values.gpsCapturedAt ?? inspectedAt;

  await assertBlockExists(values.blockId);
  await requireAssignedBlockAccess(values.blockId);
  for (const photo of values.photos) {
    validateImageUpload({ ...photo, originalName: photo.originalName ?? "inspection-photo" });
    assertInspectionPhotoKey(id, photo.storageKey);
  }

  const [existing] = await getDb().select().from(inspection).where(eq(inspection.id, id)).limit(1);
  if (existing && (existing.status !== "DRAFT" || existing.inspectorId !== session.user.id)) throw new Error("This inspection draft cannot be changed.");
  const existingPhotos = existing
    ? await getDb().select({ storageKey: inspectionPhoto.storageKey }).from(inspectionPhoto).where(eq(inspectionPhoto.inspectionId, id))
    : [];
  const existingKeys = new Set(existingPhotos.map((photo) => photo.storageKey));
  const newPhotos = values.photos.filter((photo) => !existingKeys.has(photo.storageKey));
  if (existingPhotos.length + newPhotos.length > 3) throw new Error("A maximum of 3 inspection photos is allowed.");

  await getDb().transaction(async (tx) => {
    const record = { blockId: values.blockId, inspectedAt, latitude: values.latitude.toFixed(7), longitude: values.longitude.toFixed(7), gpsAccuracy: values.gpsAccuracy.toFixed(2), gpsCapturedAt, excavatorCount: values.excavatorCount, workerCount: values.workerCount, condition: values.condition, roadCondition: values.roadCondition, environmentCondition: values.environmentCondition, activityCondition: values.activityCondition, findings: optionalValue(values.findings), notes: optionalValue(values.notes), status, updatedAt: now };
    if (existing) await tx.update(inspection).set(record).where(eq(inspection.id, id));
    else await tx.insert(inspection).values({ id, inspectorId: session.user.id, createdAt: now, ...record });

    if (newPhotos.length) {
      await tx.insert(inspectionPhoto).values(
        newPhotos.map((photo) => ({
          id: crypto.randomUUID(),
          inspectionId: id,
          storageKey: photo.storageKey,
          contentType: photo.contentType,
          sizeBytes: photo.size,
          capturedAt: photo.capturedAt ?? null,
          createdAt: now,
        })),
      );
    }

    await tx.insert(inspectionEvent).values({
      id: crypto.randomUUID(),
      inspectionId: id,
      action: status === "SUBMITTED" ? "SUBMITTED" : existing ? "DRAFT_UPDATED" : "DRAFT_SAVED",
      notes: optionalValue(values.notes),
      actorUserId: session.user.id,
      createdAt: now,
    });

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: existing ? AUDIT_ACTIONS.UPDATE : AUDIT_ACTIONS.CREATE,
        entityType: "INSPECTION",
        entityId: id,
        newValues: {
          blockId: values.blockId,
          inspectorId: session.user.id,
          inspectedAt: inspectedAt.toISOString(),
          photoCount: existingPhotos.length + newPhotos.length,
          roadCondition: values.roadCondition,
          environmentCondition: values.environmentCondition,
          activityCondition: values.activityCondition,
          status,
        },
      }),
    );
  });

  if (status === "SUBMITTED") {
    await notifyPermissionHolders({
      permission: PERMISSIONS.FIELD_ASSIGNMENT_MANAGE,
      ruleKey: "INSPECTION_SUBMITTED",
      targetKey: id,
      type: "INSPECTION_SUBMITTED",
      title: "New block inspection submitted",
      body: `Inspection for the selected block was submitted by ${session.user.name}.`,
      relatedEntityType: "INSPECTION",
      relatedEntityId: id,
    });
  }

  return { id };
}

export async function createInspection(input: unknown) {
  return saveInspection(input, "SUBMITTED");
}

export async function saveInspectionDraft(input: unknown) {
  return saveInspection(input, "DRAFT");
}

export async function finalizeInspection(input: unknown) {
  return saveInspection(input, "SUBMITTED");
}

export async function getInspectionPhotoDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.INSPECTION_READ);
  const values = parseInput(inspectionPhotoDownloadSchema.safeParse(input));
  assertInspectionPhotoKey(values.inspectionId, values.storageKey);
  const [photo] = await getDb()
    .select({ storageKey: inspectionPhoto.storageKey })
    .from(inspectionPhoto)
    .where(and(eq(inspectionPhoto.inspectionId, values.inspectionId), eq(inspectionPhoto.storageKey, values.storageKey)))
    .limit(1);
  if (!photo) throw new Error("Inspection photo was not found.");
  const [item] = await getDb().select({ blockId: inspection.blockId }).from(inspection).where(eq(inspection.id, values.inspectionId)).limit(1);
  if (!item) throw new Error("Inspection was not found.");
  await requireAssignedBlockAccess(item.blockId);
  return { downloadUrl: await getObjectStorage().createDownloadUrl(photo.storageKey) };
}
