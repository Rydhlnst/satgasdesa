import { and, desc, eq, isNull } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { blockManager } from "@/src/db/schema/block-managers";
import { block } from "@/src/db/schema/blocks";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

import { assignBlockManagerSchema, blockIdSchema, closeBlockManagerSchema } from "./schema";

function parseInput<T>(result: { success: boolean; data?: T }): T {
  if (!result.success || !result.data) throw new Error("Please check the manager assignment and try again.");
  return result.data;
}

function optionalValue(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

async function assertBlockExists(id: string): Promise<void> {
  const [targetBlock] = await getDb().select({ id: block.id }).from(block).where(eq(block.id, id)).limit(1);
  if (!targetBlock) throw new Error("Block was not found.");
}

export async function getBlockManagers(blockId: string, includeHistory = false) {
  await requirePermission(PERMISSIONS.BLOCK_READ);
  const validBlockId = parseInput(blockIdSchema.safeParse(blockId));

  return getDb()
    .select()
    .from(blockManager)
    .where(
      includeHistory
        ? eq(blockManager.blockId, validBlockId)
        : and(eq(blockManager.blockId, validBlockId), isNull(blockManager.endedAt)),
    )
    .orderBy(desc(blockManager.startedAt));
}

export async function assignBlockManager(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BLOCK_UPDATE);
  const values = parseInput(assignBlockManagerSchema.safeParse(input));
  await assertBlockExists(values.blockId);

  const database = getDb();
  const now = new Date();
  const id = crypto.randomUUID();

  await database.transaction(async (tx) => {
    const [activeAssignment] = await tx
      .select()
      .from(blockManager)
      .where(
        and(
          eq(blockManager.blockId, values.blockId),
          eq(blockManager.assignmentRole, values.assignmentRole),
          isNull(blockManager.endedAt),
        ),
      )
      .limit(1);

    if (activeAssignment) {
      await tx
        .update(blockManager)
        .set({ endedAt: values.startedAt, updatedAt: now })
        .where(eq(blockManager.id, activeAssignment.id));
    }

    await tx.insert(blockManager).values({
      id,
      blockId: values.blockId,
      assignmentRole: values.assignmentRole,
      personName: values.personName,
      contact: optionalValue(values.contact),
      startedAt: values.startedAt,
      endedAt: null,
      notes: optionalValue(values.notes),
      assignedBy: session.user.id,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "BLOCK_MANAGER",
        entityId: id,
        oldValues: activeAssignment
          ? { id: activeAssignment.id, personName: activeAssignment.personName, endedAt: values.startedAt }
          : undefined,
        newValues: {
          blockId: values.blockId,
          assignmentRole: values.assignmentRole,
          personName: values.personName,
          startedAt: values.startedAt,
        },
      }),
    );
  });

  return { id };
}

export async function closeBlockManager(input: unknown) {
  const session = await requirePermission(PERMISSIONS.BLOCK_UPDATE);
  const values = parseInput(closeBlockManagerSchema.safeParse(input));
  const database = getDb();
  const [assignment] = await database.select().from(blockManager).where(eq(blockManager.id, values.id)).limit(1);

  if (!assignment) throw new Error("Manager assignment was not found.");
  if (assignment.endedAt) throw new Error("Manager assignment has already ended.");
  if (values.endedAt < assignment.startedAt) throw new Error("End date cannot be before the assignment start date.");

  await database.transaction(async (tx) => {
    await tx
      .update(blockManager)
      .set({ endedAt: values.endedAt, updatedAt: new Date() })
      .where(eq(blockManager.id, assignment.id));

    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "BLOCK_MANAGER",
        entityId: assignment.id,
        oldValues: { endedAt: null },
        newValues: { endedAt: values.endedAt },
      }),
    );
  });

  return { id: assignment.id, endedAt: values.endedAt };
}
