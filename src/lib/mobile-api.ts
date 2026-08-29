import { asc, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { getDb } from "@/src/db";
import { user } from "@/src/db/schema/auth";
import { role, userRole } from "@/src/db/schema/rbac";
import { getUserPermissions } from "@/src/lib/permissions/authorize";
import { createAuth } from "@/src/lib/auth/auth";
import { runWithRequestSession, setRequestSession } from "@/src/lib/auth/request-context";

export type ApiDiagnostics = { requestId: string; appRevision: string };

export function getDeploymentRevision() {
  return process.env.APP_REVISION?.trim()
    || process.env.COOLIFY_COMMIT_SHA?.trim()
    || process.env.GIT_COMMIT_SHA?.trim()
    || process.env.SOURCE_COMMIT?.trim()
    || process.env.COMMIT_SHA?.trim()
    || "unknown";
}

export function getApiDiagnostics(requestId = crypto.randomUUID()): ApiDiagnostics {
  return { requestId, appRevision: getDeploymentRevision() };
}

export function apiDiagnosticHeaders(requestId = crypto.randomUUID()) {
  const diagnostics = getApiDiagnostics(requestId);
  return { "Cache-Control": "no-store", "X-Request-ID": diagnostics.requestId, "X-App-Revision": diagnostics.appRevision };
}

function responseWithDiagnostics(response: Response, requestId: string) {
  const headers = new Headers(response.headers);
  const diagnostics = getApiDiagnostics(headers.get("X-Request-ID") || requestId);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Request-ID", diagnostics.requestId);
  headers.set("X-App-Revision", diagnostics.appRevision);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export async function getMobileSession(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.toLowerCase().startsWith("bearer ")) return null;

  const session = await createAuth().api.getSession({ headers: request.headers });
  if (!session) return null;

  const [currentUser] = await getDb()
    .select({ status: user.status })
    .from(user)
    .where(eq(user.id, session.user.id))
    .limit(1);
  if (currentUser?.status !== "ACTIVE") return null;
  setRequestSession(session);

  const permissions = await getUserPermissions(session.user.id);
  const [assignment] = await getDb()
    .select({ roleName: role.name })
    .from(userRole)
    .innerJoin(role, eq(role.id, userRole.roleId))
    .where(eq(userRole.userId, session.user.id))
    .orderBy(asc(role.name))
    .limit(1);
  return { ...session, permissions, role: assignment?.roleName ?? null };
}

export function unauthorizedResponse(requestId?: string) {
  const diagnostics = getApiDiagnostics(requestId);
  return Response.json({ error: "UNAUTHORIZED", message: "Your session is invalid or expired.", diagnostics }, { status: 401, headers: apiDiagnosticHeaders(diagnostics.requestId) });
}

export function apiNotFoundResponse(message: string, requestId?: string) {
  const diagnostics = getApiDiagnostics(requestId);
  return Response.json({ error: "NOT_FOUND", message, diagnostics }, { status: 404, headers: apiDiagnosticHeaders(diagnostics.requestId) });
}

export async function withMobileSession<T>(request: Request, callback: () => Promise<T>): Promise<T | Response> {
  const requestId = request.headers.get("x-client-request-id")?.trim() || crypto.randomUUID();
  const session = await getMobileSession(request);
  if (!session) return unauthorizedResponse(requestId);
  const result = await runWithRequestSession(session, callback);
  return result instanceof Response ? responseWithDiagnostics(result, requestId) : result;
}

export function apiErrorResponse(error: unknown) {
  const validationIssues = error instanceof ZodError ? error.issues.slice(0, 10) : [];
  const validationMessage = validationIssues.length
    ? validationIssues.map((issue) => `${issue.path.length ? `${issue.path.join(".")}: ` : ""}${issue.message}`).join(" ")
    : undefined;
  const message = validationMessage || (error instanceof Error ? error.message : "Unable to load the requested data.");
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
  const safeMessages: Record<number, string> = { 400: "Invalid request data.", 401: "Your session is invalid or expired.", 403: "You do not have permission to perform this action.", 404: "The requested API route or resource was not found. Verify that Coolify deployed the latest GitHub commit and that the mobile API URL is correct.", 409: "The request conflicts with current data.", 422: "The request could not be processed.", 429: "Too many requests. Try again later.", 500: "The server failed to process the request. Check Coolify deployment logs, database connectivity, and migrations.", 503: "The service is not ready. Coolify may be redeploying, migrations may still be running, or the database may be unavailable." };
  const diagnostics = getApiDiagnostics();
  const response = { error: code, message: status === 400 && validationMessage ? validationMessage : safeMessages[status] ?? safeMessages[500], diagnostics } as { error: string; message: string; fields?: Record<string, string>; diagnostics: ApiDiagnostics };
  if (status === 400 && validationIssues.length) {
    response.fields = Object.fromEntries(validationIssues.filter((issue) => issue.path.length).map((issue) => [issue.path.join("."), issue.message]));
  }
  return Response.json(response, { status, headers: apiDiagnosticHeaders(diagnostics.requestId) });
}
