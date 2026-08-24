import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { permission, rolePermission, userRole } from "@/src/db/schema/rbac";
import { getDb } from "@/src/db";
import { getSession } from "@/src/lib/auth/session";
import { getRequestSession } from "@/src/lib/auth/request-context";

import type { Permission } from "./constants";

export async function requireAuth() {
  const session = getRequestSession() ?? await getSession();

  if (!session) {
    if (getRequestSession() !== undefined) {
      const error = new Error("Authentication is required.");
      Object.assign(error, { code: "UNAUTHORIZED", status: 401 });
      throw error;
    }
    redirect("/login");
  }

  return session;
}

export async function getUserPermissions(userId: string): Promise<Permission[]> {
  const rows = await getDb()
    .select({ name: permission.name })
    .from(userRole)
    .innerJoin(rolePermission, eq(rolePermission.roleId, userRole.roleId))
    .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
    .where(eq(userRole.userId, userId));

  return rows.map((row) => row.name as Permission);
}

export async function hasPermission(userId: string, required: Permission): Promise<boolean> {
  const rows = await getDb()
    .select({ id: permission.id })
    .from(userRole)
    .innerJoin(rolePermission, eq(rolePermission.roleId, userRole.roleId))
    .innerJoin(permission, eq(permission.id, rolePermission.permissionId))
    .where(and(eq(userRole.userId, userId), eq(permission.name, required)))
    .limit(1);

  return rows.length > 0;
}

export async function requirePermission(required: Permission) {
  const session = await requireAuth();
  const allowed = await hasPermission(session.user.id, required);

  if (!allowed) {
    if (getRequestSession()) {
      const error = new Error("You do not have permission to perform this action.");
      Object.assign(error, { code: "FORBIDDEN", status: 403, requiredPermission: required });
      throw error;
    }
    redirect("/unauthorized");
  }

  return session;
}
