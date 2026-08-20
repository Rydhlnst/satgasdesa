import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { inspection, inspectionPhoto } from "@/src/db/schema/inspections";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateImageUpload } from "@/src/lib/storage";

import { createInspectionSchema, inspectionIdSchema, inspectionPhotoDownloadSchema, inspectionUploadSchema } from "./schema";

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

export async function getInspections(blockId?: string) {
  await requirePermission(PERMISSIONS.INSPECTION_READ);
  const query = getDb()
    .select({
      id: inspection.id,
      blockId: inspection.blockId,
      blockCode: block.code,
      blockName: block.name,
      inspectorId: inspection.inspectorId,
      inspectedAt: inspection.inspectedAt,
      condition: inspection.condition,
      excavatorCount: inspection.excavatorCount,
      workerCount: inspection.workerCount,
    })
    .from(inspection)
    .innerJoin(block, eq(block.id, inspection.blockId));

  return blockId
    ? query.where(eq(inspection.blockId, blockId)).orderBy(desc(inspection.inspectedAt)).limit(100)
    : query.orderBy(desc(inspection.inspectedAt)).limit(100);
}

export async function getInspection(id: string) {
  await requirePermission(PERMISSIONS.INSPECTION_READ);
  const validId = parseInput(inspectionIdSchema.safeParse(id));
  const [item] = await getDb().select().from(inspection).where(eq(inspection.id, validId)).limit(1);
  if (!item) return null;

  const photos = await getDb()
    .select()
    .from(inspectionPhoto)
    .where(eq(inspectionPhoto.inspectionId, validId))
    .orderBy(inspectionPhoto.createdAt);

  return { item, photos };
}

export async function createInspection(input: unknown) {
  const session = await requirePermission(PERMISSIONS.INSPECTION_CREATE);
  const values = parseInput(createInspectionSchema.safeParse(input));
  const id = values.id ?? crypto.randomUUID();
  const now = new Date();
  const inspectedAt = values.inspectedAt ?? now;
  const gpsCapturedAt = values.gpsCapturedAt ?? inspectedAt;

  await assertBlockExists(values.blockId);
  for (const photo of values.photos) {
    validateImageUpload(photo);
    assertInspectionPhotoKey(id, photo.storageKey);
  }

  const [existing] = await getDb().select({ id: inspection.id }).from(inspection).where(eq(inspection.id, id)).limit(1);
  if (existing) throw new Error("This inspection has already been finalized.");

  await getDb().transaction(async (tx) => {
    await tx.insert(inspection).values({
      id,
      blockId: values.blockId,
      inspectorId: session.user.id,
      inspectedAt,
      latitude: values.latitude.toFixed(7),
      longitude: values.longitude.toFixed(7),
      gpsAccuracy: values.gpsAccuracy.toFixed(2),
      gpsCapturedAt,
      excavatorCount: values.excavatorCount,
      workerCount: values.workerCount,
      condition: values.condition,
      findings: optionalValue(values.findings),
      notes: optionalValue(values.notes),
      createdAt: now,
      updatedAt: now,
    });

    if (values.photos.length) {
      await tx.insert(inspectionPhoto).values(
        values.photos.map((photo) => ({
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

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.CREATE,
        entityType: "INSPECTION",
        entityId: id,
        newValues: {
          blockId: values.blockId,
          inspectorId: session.user.id,
          inspectedAt: inspectedAt.toISOString(),
          photoCount: values.photos.length,
        },
      }),
    );
  });

  return { id };
}

export async function finalizeInspection(input: unknown) {
  return createInspection(input);
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
  return { downloadUrl: await getObjectStorage().createDownloadUrl(photo.storageKey) };
}
