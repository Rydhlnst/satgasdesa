import "server-only";

import { eq } from "drizzle-orm";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { user } from "@/src/db/schema/auth";
import { createAuditLogValues, AUDIT_ACTIONS } from "@/src/lib/audit";
import { requireAuth } from "@/src/lib/permissions/authorize";

import { updateMyProfileSchema } from "./schema";

export async function getMyProfile() {
  const session = await requireAuth();
  const [profile] = await getDb()
    .select({ id: user.id, name: user.name, email: user.email, phone: user.phone, image: user.image, status: user.status })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);

  if (!profile) throw new Error("Profile was not found.");
  return profile;
}

export async function updateMyProfile(input: unknown) {
  const session = await requireAuth();
  const values = updateMyProfileSchema.parse(input);
  const [current] = await getDb().select().from(user).where(eq(user.id, session.user.id)).limit(1);
  if (!current) throw new Error("Profile was not found.");

  const next = {
    name: values.name,
    phone: values.phone || null,
    image: values.image || null,
    updatedAt: new Date(),
  };

  await getDb().transaction(async (tx) => {
    await tx.update(user).set(next).where(eq(user.id, session.user.id));
    await tx.insert(auditLog).values(createAuditLogValues({
      actorUserId: session.user.id,
      action: AUDIT_ACTIONS.UPDATE,
      entityType: "PROFILE",
      entityId: session.user.id,
      oldValues: { name: current.name, phone: current.phone, image: current.image },
      newValues: { name: next.name, phone: next.phone, image: next.image },
    }));
  });

  return { id: session.user.id, ...next };
}
