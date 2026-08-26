import { desc, eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { financialTransaction } from "@/src/db/schema/finance";
import { realizationApproval, realizationEvidence, transactionEvidence } from "@/src/db/schema/history-evidence";
import { realizationRequest } from "@/src/db/schema/budgets";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";
import { getObjectStorage, validateUpload } from "@/src/lib/storage";

const uuid = z.string().uuid();
const contentType = z.enum(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const evidenceMetadataSchema = z.object({ contentType, sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024) });

function transactionStorageScope(transactionId: string): string {
  return `finance/transactions/${transactionId}/`;
}

function realizationStorageScope(realizationId: string): string {
  return `finance/realizations/${realizationId}/`;
}

function assertScopedStorageKey(scope: string, storageKey: string): void {
  const suffix = storageKey.startsWith(scope) ? storageKey.slice(scope.length) : "";
  if (!suffix || suffix.includes("/") || suffix.includes("\\") || suffix.includes("..")) throw new Error("Evidence key is outside the permitted storage scope.");
}

function validateEvidenceMetadata(storageKey: string, values: z.infer<typeof evidenceMetadataSchema>): void {
  validateUpload({ contentType: values.contentType, size: values.sizeBytes, originalName: storageKey });
}

export async function createTransactionEvidenceUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.FINANCE_CREATE);
  const values = z.object({ transactionId: uuid, originalName: z.string().trim().min(1).max(255) }).merge(evidenceMetadataSchema).parse(input);
  const [transaction] = await getDb().select({ id: financialTransaction.id, status: financialTransaction.status }).from(financialTransaction).where(eq(financialTransaction.id, values.transactionId)).limit(1);
  if (!transaction) throw new Error("Financial transaction was not found.");
  if (transaction.status !== "DRAFT") throw new Error("Evidence can only be uploaded for draft financial transactions.");
  validateUpload({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName });
  const scope = transactionStorageScope(values.transactionId);
  const upload = await getObjectStorage().createUploadUrl({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName, scope });
  assertScopedStorageKey(scope, upload.key);
  return { transactionId: values.transactionId, key: upload.key, uploadUrl: upload.uploadUrl, contentType: values.contentType, sizeBytes: values.sizeBytes };
}

export async function addTransactionEvidence(input: unknown) {
  const session = await requirePermission(PERMISSIONS.FINANCE_CREATE);
  const value = z.object({ transactionId: uuid, storageKey: z.string().min(1).max(255) }).merge(evidenceMetadataSchema).parse(input);
  assertScopedStorageKey(transactionStorageScope(value.transactionId), value.storageKey);
  validateEvidenceMetadata(value.storageKey, value);
  const database = getDb();
  const [transaction] = await database.select({ id: financialTransaction.id, status: financialTransaction.status }).from(financialTransaction).where(eq(financialTransaction.id, value.transactionId)).limit(1);
  if (!transaction) throw new Error("Financial transaction was not found.");
  if (transaction.status !== "DRAFT") throw new Error("Evidence can only be added to draft financial transactions.");
  await getObjectStorage().verifyObject(value.storageKey, {
    contentType: value.contentType,
    size: value.sizeBytes,
    originalName: value.storageKey.split("/").at(-1) ?? "evidence",
  });
  const id = crypto.randomUUID();
  await database.transaction(async (tx) => {
    await tx.insert(transactionEvidence).values({ id, transactionId: value.transactionId, storageKey: value.storageKey, contentType: value.contentType, sizeBytes: value.sizeBytes, createdBy: session.user.id, createdAt: new Date() });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "TRANSACTION_EVIDENCE", entityId: id, newValues: { transactionId: value.transactionId, storageKey: value.storageKey, contentType: value.contentType, sizeBytes: value.sizeBytes } }));
  });
  return { id };
}

export async function getTransactionEvidence(transactionId: string) {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const parsedTransactionId = uuid.parse(transactionId);
  const rows = await getDb().select().from(transactionEvidence).where(eq(transactionEvidence.transactionId, parsedTransactionId)).orderBy(desc(transactionEvidence.createdAt));
  rows.forEach((row) => assertScopedStorageKey(transactionStorageScope(parsedTransactionId), row.storageKey));
  return rows;
}

export async function getTransactionEvidenceDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.FINANCE_READ);
  const value = z.object({ transactionId: uuid, evidenceId: uuid }).parse(input);
  const [row] = await getDb().select().from(transactionEvidence).where(eq(transactionEvidence.id, value.evidenceId)).limit(1);
  if (!row || row.transactionId !== value.transactionId) throw new Error("Transaction evidence was not found.");
  assertScopedStorageKey(transactionStorageScope(value.transactionId), row.storageKey);
  return { url: await getObjectStorage().createDownloadUrl(row.storageKey) };
}

export async function createRealizationEvidenceUploadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.REALIZATION_CREATE);
  const values = z.object({ realizationId: uuid, originalName: z.string().trim().min(1).max(255) }).merge(evidenceMetadataSchema).parse(input);
  const [realization] = await getDb().select({ id: realizationRequest.id, status: realizationRequest.status }).from(realizationRequest).where(eq(realizationRequest.id, values.realizationId)).limit(1);
  if (!realization) throw new Error("Realization was not found.");
  if (["SAH", "REJECTED"].includes(realization.status)) throw new Error("Evidence cannot be uploaded for this realization status.");
  validateUpload({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName });
  const scope = realizationStorageScope(values.realizationId);
  const upload = await getObjectStorage().createUploadUrl({ contentType: values.contentType, size: values.sizeBytes, originalName: values.originalName, scope });
  assertScopedStorageKey(scope, upload.key);
  return { realizationId: values.realizationId, key: upload.key, uploadUrl: upload.uploadUrl, contentType: values.contentType, sizeBytes: values.sizeBytes };
}

export async function addRealizationEvidence(input: unknown) {
  const session = await requirePermission(PERMISSIONS.REALIZATION_CREATE);
  const value = z.object({ realizationId: uuid, storageKey: z.string().min(1).max(255) }).merge(evidenceMetadataSchema).parse(input);
  assertScopedStorageKey(realizationStorageScope(value.realizationId), value.storageKey);
  validateEvidenceMetadata(value.storageKey, value);
  const [realization] = await getDb().select({ id: realizationRequest.id, status: realizationRequest.status }).from(realizationRequest).where(eq(realizationRequest.id, value.realizationId)).limit(1);
  if (!realization) throw new Error("Realization was not found.");
  if (["SAH", "REJECTED"].includes(realization.status)) throw new Error("Evidence cannot be added for this realization status.");
  await getObjectStorage().verifyObject(value.storageKey, {
    contentType: value.contentType,
    size: value.sizeBytes,
    originalName: value.storageKey.split("/").at(-1) ?? "evidence",
  });
  const id = crypto.randomUUID();
  await getDb().transaction(async (tx) => {
    await tx.insert(realizationEvidence).values({ id, realizationId: value.realizationId, storageKey: value.storageKey, contentType: value.contentType, sizeBytes: value.sizeBytes, createdBy: session.user.id, createdAt: new Date() });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "REALIZATION_EVIDENCE", entityId: id, newValues: { realizationId: value.realizationId, storageKey: value.storageKey, contentType: value.contentType, sizeBytes: value.sizeBytes } }));
  });
  return { id };
}

export async function getRealizationEvidence(realizationId: string) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  const parsedRealizationId = uuid.parse(realizationId);
  const rows = await getDb().select().from(realizationEvidence).where(eq(realizationEvidence.realizationId, parsedRealizationId)).orderBy(desc(realizationEvidence.createdAt));
  rows.forEach((row) => assertScopedStorageKey(realizationStorageScope(parsedRealizationId), row.storageKey));
  return rows;
}

export async function getRealizationEvidenceDownloadUrl(input: unknown) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  const value = z.object({ realizationId: uuid, evidenceId: uuid }).parse(input);
  const [row] = await getDb().select().from(realizationEvidence).where(eq(realizationEvidence.id, value.evidenceId)).limit(1);
  if (!row || row.realizationId !== value.realizationId) throw new Error("Realization evidence was not found.");
  assertScopedStorageKey(realizationStorageScope(value.realizationId), row.storageKey);
  return { url: await getObjectStorage().createDownloadUrl(row.storageKey) };
}

export async function getRealizationApprovals(realizationId: string) {
  await requirePermission(PERMISSIONS.REALIZATION_READ);
  return getDb().select().from(realizationApproval).where(eq(realizationApproval.realizationId, uuid.parse(realizationId))).orderBy(desc(realizationApproval.createdAt));
}
