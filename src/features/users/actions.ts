"use server";

import { and, asc, eq, like, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";

import { getDb } from "@/src/db";
import { account, user } from "@/src/db/schema/auth";
import { auditLog } from "@/src/db/schema/audit";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS, ROLES, type RoleName } from "@/src/lib/permissions/constants";
import { role, userRole } from "@/src/db/schema/rbac";

const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
type UserStatus = (typeof USER_STATUSES)[number];

const userFiltersSchema = z.object({
  query: z.string().trim().max(100).optional(),
  status: z.enum(USER_STATUSES).optional(),
  roleId: z.string().trim().max(64).optional(),
});

export type UserCreateState = {
  error: string | null;
  success: string | null;
};

const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(255),
  email: z.string().trim().email("Enter a valid email address.").max(255),
  roleId: z.enum([ROLES.PIMPINAN, ROLES.BENDAHARA, ROLES.PETUGAS_LAPANGAN]),
  password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password must be 128 characters or fewer."),
});
const userIdSchema = z.string().uuid("Invalid user ID.");

function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function readStatus(formData: FormData): UserStatus {
  const status = readRequiredString(formData, "status");
  if (!USER_STATUSES.includes(status as UserStatus)) {
    throw new Error("Invalid user status.");
  }
  return status as UserStatus;
}

export async function getUsers(input?: unknown) {
  await requirePermission(PERMISSIONS.USER_READ);

  const filters = userFiltersSchema.parse(input ?? {});
  const conditions = [];
  if (filters.query) {
    conditions.push(or(like(user.name, `%${filters.query}%`), like(user.email, `%${filters.query}%`)));
  }
  if (filters.status) conditions.push(eq(user.status, filters.status));
  if (filters.roleId) conditions.push(eq(role.id, filters.roleId));

  return getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      roleId: role.id,
      roleName: role.name,
    })
    .from(user)
    .leftJoin(userRole, eq(userRole.userId, user.id))
    .leftJoin(role, eq(role.id, userRole.roleId))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(user.name));
}

export async function getRoles() {
  await requirePermission(PERMISSIONS.USER_READ);
  return getDb().select({ id: role.id, name: role.name }).from(role).orderBy(role.name);
}

export async function getUserById(userId: string) {
  await requirePermission(PERMISSIONS.USER_READ);
  const validUserId = userIdSchema.parse(userId);

  const [item] = await getDb()
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roleId: role.id,
      roleName: role.name,
    })
    .from(user)
    .leftJoin(userRole, eq(userRole.userId, user.id))
    .leftJoin(role, eq(role.id, userRole.roleId))
    .where(eq(user.id, validUserId))
    .limit(1);

  return item ?? null;
}

export async function createUser(
  _previousState: UserCreateState,
  formData: FormData,
): Promise<UserCreateState> {
  const session = await requirePermission(PERMISSIONS.USER_MANAGE);
  const values = createUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    roleId: formData.get("roleId"),
    password: formData.get("password"),
  });

  if (!values.success) {
    return { error: values.error.issues[0]?.message ?? "Check the user details.", success: null };
  }

  const email = values.data.email.toLowerCase();
  const database = getDb();
  const [existingUser] = await database.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
  if (existingUser) return { error: "An account with that email already exists.", success: null };

  const [targetRole] = await database
    .select({ id: role.id })
    .from(role)
    .where(and(eq(role.id, values.data.roleId), eq(role.name, values.data.roleId)))
    .limit(1);
  if (!targetRole) return { error: "The selected role is not available.", success: null };

  const userId = crypto.randomUUID();
  const now = new Date();
  const passwordHash = await hashPassword(values.data.password);

  try {
    await database.transaction(async (tx) => {
      await tx.insert(user).values({
        id: userId,
        name: values.data.name,
        email,
        emailVerified: true,
        image: null,
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(account).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(userRole).values({
        userId,
        roleId: values.data.roleId,
        assignedAt: now,
        assignedBy: session.user.id,
      });
      await tx.insert(auditLog).values(
        createAuditLogValues({
          actorUserId: session.user.id,
          action: AUDIT_ACTIONS.CREATE,
          entityType: "USER",
          entityId: userId,
          newValues: { name: values.data.name, email, roleId: values.data.roleId, createdDirectly: true },
        }),
      );
    });
  } catch {
    return { error: "Unable to create the user. Check the details and try again.", success: null };
  }

  revalidatePath("/dashboard/settings/users");
  return { error: null, success: `Account created for ${email}.` };
}

export async function updateUserStatus(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.USER_MANAGE);
  const userId = userIdSchema.parse(readRequiredString(formData, "userId"));
  const status = readStatus(formData);

  if (userId === session.user.id && status === "INACTIVE") {
    throw new Error("You cannot deactivate your own account.");
  }

  const [currentUser] = await getDb()
    .select({ id: user.id, status: user.status })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  if (!currentUser || currentUser.status === status) return;

  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.update(user).set({ status, updatedAt: now }).where(eq(user.id, userId));
    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.STATUS_CHANGE,
        entityType: "USER",
        entityId: userId,
        oldValues: { status: currentUser.status },
        newValues: { status },
      }),
    );
  });

  revalidatePath("/dashboard/settings/users");
}

export async function assignUserRole(formData: FormData) {
  const session = await requirePermission(PERMISSIONS.USER_MANAGE);
  const userId = userIdSchema.parse(readRequiredString(formData, "userId"));
  const roleId = readRequiredString(formData, "roleId");

  if (!Object.values(ROLES).includes(roleId as RoleName)) {
    throw new Error("Invalid role.");
  }

  const [targetRole] = await getDb()
    .select({ id: role.id })
    .from(role)
    .where(and(eq(role.id, roleId), eq(role.name, roleId)))
    .limit(1);

  if (!targetRole) throw new Error("Role is not available.");

  const [currentAssignment] = await getDb()
    .select({ roleId: userRole.roleId })
    .from(userRole)
    .where(eq(userRole.userId, userId))
    .limit(1);

  const now = new Date();
  await getDb().transaction(async (tx) => {
    await tx.delete(userRole).where(eq(userRole.userId, userId));
    await tx.insert(userRole).values({ userId, roleId, assignedAt: now, assignedBy: session.user.id });
    await tx.insert(auditLog).values(
      createAuditLogValues({
        actorUserId: session.user.id,
        action: AUDIT_ACTIONS.UPDATE,
        entityType: "USER_ROLE",
        entityId: userId,
        oldValues: { roleId: currentAssignment?.roleId ?? null },
        newValues: { roleId },
      }),
    );
  });

  revalidatePath("/dashboard/settings/users");
}
