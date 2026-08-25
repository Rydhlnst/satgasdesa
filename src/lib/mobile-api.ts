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
  const inferredStatus = error instanceof ZodError || error instanceof SyntaxError
    ? 400
    : /already exists|already used|already been finalized|changed by another|exceeds|incomplete and require reconciliation|no block snapshot/i.test(message)
      ? 409
      : /not found/i.test(message)
        ? 404
        : /check the|invalid |required\.|must use|unsupported|outside the permitted|must be supplied/i.test(message)
          ? 400
          : /storage is not configured|storage is not fully configured/i.test(message)
            ? 503
            : 500;
  const status = [400, 401, 403, 404, 409, 422, 429, 500, 503].includes(explicitStatus ?? -1) ? explicitStatus! : inferredStatus;
  const codeByStatus: Record<number, string> = { 400: "VALIDATION_FAILED", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 422: "VALIDATION_FAILED", 429: "RATE_LIMITED", 500: "REQUEST_FAILED", 503: "SERVICE_UNAVAILABLE" };
  const candidateCode = typeof error === "object" && error && "code" in error && typeof error.code === "string" ? error.code : "";
  const code = /^[A-Z][A-Z0-9_]{1,63}$/.test(candidateCode) ? candidateCode : codeByStatus[status] ?? "REQUEST_FAILED";
  const safeMessages: Record<number, string> = { 400: "Invalid request data.", 401: "Your session is invalid or expired.", 403: "You do not have permission to perform this action.", 404: "The requested resource was not found.", 409: "The request conflicts with current data.", 422: "The request could not be processed.", 429: "Too many requests. Try again later.", 500: "Unable to process the request.", 503: "The service is temporarily unavailable." };
  return Response.json({ error: code, message: safeMessages[status] ?? safeMessages[500] }, { status });
}
