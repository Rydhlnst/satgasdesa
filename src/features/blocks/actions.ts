"use server";

import { and, desc, eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { block } from "@/src/db/schema/blocks";
import { blockHistory } from "@/src/db/schema/history-evidence";
import { blockManager } from "@/src/db/schema/block-managers";
import { dailyInformation } from "@/src/db/schema/daily-information";
import { excavator } from "@/src/db/schema/excavators";
import { inspection } from "@/src/db/schema/inspections";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

import { blockFormSchema, blockIdSchema, type BlockFormValues } from "./schema";

function readString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function parseBlockForm(formData: FormData): BlockFormValues {
  const parsed = blockFormSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) throw new Error("Please check the block details and try again.");
  return parsed.data;
}

function optionalValue(value: string): string | null {
  return value.trim() === "" ? null : value.trim();
}

function blockValues(values: BlockFormValues) {
  return {
    code: values.code,
    name: values.name,
    status: values.status,
    latitude: values.latitude.toFixed(7),
    longitude: values.longitude.toFixed(7),
    locationPhotoKey: optionalValue(values.locationPhotoKey ?? ""),
    managerName: optionalValue(values.managerName ?? ""),
    locationPicName: optionalValue(values.locationPicName ?? ""),
    fieldPicName: optionalValue(values.fieldPicName ?? ""),
    contact: optionalValue(values.contact ?? ""),
    workerCount: values.workerCount,
    operationalCondition: values.operationalCondition,
    startDate: optionalValue(values.startDate ?? ""),
    notes: optionalValue(values.notes ?? ""),
    updatedAt: new Date(),
  };
}

export async function getBlocks(search?: string, status?: string) {
  await requirePermission(PERMISSIONS.BLOCK_READ);
  const normalizedSearch = search?.trim();
  const filters = [];

  if (normalizedSearch) {
    filters.push(or(like(block.code, `%${normalizedSearch}%`), like(block.name, `%${normalizedSearch}%`)));
  }
  if (status && ["ACTIVE", "STOPPED", "NOT_OPERATING"].includes(status)) {
    filters.push(eq(block.status, status));
  }

  return getDb()
    .select()
    .from(block)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(block.code)
    .limit(100);
}

export async function getBlock(id: string) {
  await requirePermission(PERMISSIONS.BLOCK_READ);
  const validId = blockIdSchema.parse(id);
  const [result] = await getDb().select().from(block).where(eq(block.id, validId)).limit(1);
  return result ?? null;
}

export async function getBlockDetails(id: string) {
  await requirePermission(PERMISSIONS.BLOCK_READ);
  const validId = blockIdSchema.parse(id);
  const database = getDb();
  const [item] = await database.select().from(block).where(eq(block.id, validId)).limit(1);
  if (!item) return null;

  const [excavators, inspections, dailyInformationItems, managers, history] = await Promise.all([
    database.select().from(excavator).where(eq(excavator.currentBlockId, validId)).orderBy(excavator.unitCode),
    database.select().from(inspection).where(eq(inspection.blockId, validId)).orderBy(desc(inspection.inspectedAt)),
    database.select().from(dailyInformation).where(eq(dailyInformation.blockId, validId)).orderBy(desc(dailyInformation.reportedAt)),
    database.select().from(blockManager).where(eq(blockManager.blockId, validId)).orderBy(desc(blockManager.startedAt)),
    database.select().from(blockHistory).where(eq(blockHistory.blockId, validId)).orderBy(desc(blockHistory.createdAt)),
  ]);

  return { item, excavators, inspections, dailyInformation: dailyInformationItems, managers, history };
}

export async function createBlock(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.BLOCK_CREATE);
  const values = parseBlockForm(formData);
  const id = crypto.randomUUID();
  const now = new Date();

  await getDb().transaction(async (tx) => {
    await tx.insert(block).values({ id, ...blockValues(values), createdAt: now, updatedAt: now });
    await tx.insert(blockHistory).values({ id: crypto.randomUUID(), blockId: id, action: AUDIT_ACTIONS.CREATE, oldValues: null, newValues: JSON.stringify({ code: values.code, name: values.name, status: values.status }), changedBy: session.user.id, createdAt: now });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.CREATE, entityType: "BLOCK", entityId: id, newValues: { code: values.code, name: values.name, status: values.status } }));
  });

  revalidatePath("/dashboard/blocks");
  redirect("/dashboard/blocks");
}

export async function updateBlock(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.BLOCK_UPDATE);
  const id = readString(formData, "id").trim();
  if (!id) throw new Error("Block ID is required.");

  const values = parseBlockForm(formData);
  const [existing] = await getDb().select().from(block).where(eq(block.id, id)).limit(1);
  if (!existing) throw new Error("Block was not found.");

  const oldValues = { code: existing.code, name: existing.name, status: existing.status };
  const newValues = { code: values.code, name: values.name, status: values.status };
  await getDb().transaction(async (tx) => {
    await tx.update(block).set(blockValues(values)).where(eq(block.id, id));
    await tx.insert(blockHistory).values({ id: crypto.randomUUID(), blockId: id, action: AUDIT_ACTIONS.UPDATE, oldValues: JSON.stringify(oldValues), newValues: JSON.stringify(newValues), changedBy: session.user.id, createdAt: new Date() });
    await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "BLOCK", entityId: id, oldValues, newValues }));
  });

  revalidatePath("/dashboard/blocks");
  revalidatePath(`/dashboard/blocks/${id}`);
  revalidatePath(`/dashboard/blocks/${id}/edit`);
  redirect(`/dashboard/blocks/${id}`);
}
