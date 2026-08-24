import { eq } from "drizzle-orm";
import { ZodError } from "zod";

import { getDb } from "@/src/db";
import { user } from "@/src/db/schema/auth";
import { role, userRole } from "@/src/db/schema/rbac";
import { getUserPermissions } from "@/src/lib/permissions/authorize";
import { createAuth } from "@/src/lib/auth/auth";
import { runWithRequestSession, setRequestSession } from "@/src/lib/auth/request-context";

export async function getMobileSession(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;

  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session) return null;
  setRequestSession(session);

  const [currentUser] = await getDb()
    .select({ status: user.status })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (currentUser?.status !== "ACTIVE") return null;

  const permissions = await getUserPermissions(session.user.id);
  const [assignment] = await getDb()
    .select({ roleName: role.name })
    .from(userRole)
    .innerJoin(role, eq(role.id, userRole.roleId))
    .where(eq(userRole.userId, session.user.id))
    .limit(1);
  return { ...session, permissions, role: assignment?.roleName ?? null };
}

export function unauthorizedResponse() {
  return Response.json({ error: "UNAUTHORIZED", message: "Your session is invalid or expired." }, { status: 401 });
}

export async function withMobileSession<T>(request: Request, callback: () => Promise<T>): Promise<T | Response> {
  const session = await getMobileSession(request);
  if (!session) return unauthorizedResponse();
  return runWithRequestSession(session, callback);
}

export function apiErrorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to load the requested data.";
  const explicitStatus = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined;
  const status = explicitStatus ?? (error instanceof ZodError ? 400 : /already exists|already used|already been finalized|changed by another|exceeds|incomplete and require reconciliation|no block snapshot/i.test(message) ? 409 : /not found/i.test(message) ? 404 : /check the|invalid |required\.|must use|unsupported|outside the permitted|must be supplied/i.test(message) ? 400 : /storage is not configured|storage is not fully configured/i.test(message) ? 503 : 500);
  const code = typeof error === "object" && error && "code" in error && typeof error.code === "string" ? error.code : status === 400 ? "VALIDATION_FAILED" : status === 404 ? "NOT_FOUND" : status === 409 ? "CONFLICT" : status === 503 ? "SERVICE_UNAVAILABLE" : status === 403 ? "FORBIDDEN" : status === 401 ? "UNAUTHORIZED" : "REQUEST_FAILED";
  return Response.json({ error: code, message }, { status });
}
