import { asc, eq } from "drizzle-orm";
import { ZodError } from "zod";

import { getDb } from "@/src/db";
import { user } from "@/src/db/schema/auth";
import { role, userRole } from "@/src/db/schema/rbac";
import { getUserPermissions } from "@/src/lib/permissions/authorize";
import { createAuth } from "@/src/lib/auth/auth";
import { runWithRequestSession, setRequestSession } from "@/src/lib/auth/request-context";

export type ApiDiagnostics = { requestId: string; appRevision: string };

function localizeApiMessage(message: string) {
  const value = message.trim();
  const translations: Array<[RegExp, string]> = [
    [/^Invalid UUID\.?$/i, "ID tidak valid."],
    [/^Payment exceeds the outstanding balance\.?$/i, "Jumlah pembayaran melebihi sisa tagihan."],
    [/^Confirmed and pending payments cannot exceed the due amount\.?$/i, "Total pembayaran yang sudah dikonfirmasi dan masih menunggu tidak boleh melebihi jumlah tagihan."],
    [/^This due has already been fully paid\.?$/i, "Iuran ini sudah lunas."],
    [/^Only pending payments can be confirmed\.?$/i, "Hanya pembayaran yang masih menunggu yang dapat dikonfirmasi."],
    [/^Only pending payments can be rejected\.?$/i, "Hanya pembayaran yang masih menunggu yang dapat ditolak."],
    [/^Only confirmed payments can be reversed\.?$/i, "Hanya pembayaran yang sudah dikonfirmasi yang dapat dibatalkan."],
    [/^Only approved payment transactions can be reversed\.?$/i, "Hanya transaksi pembayaran yang sudah disahkan yang dapat dibatalkan."],
    [/^Monthly payments can only be recorded from day 1 through day 10 of the month\.?$/i, "Pembayaran bulanan hanya dapat dicatat dari tanggal 1 sampai 10 setiap bulan."],
    [/^Due payment was not found\.?$/i, "Pembayaran iuran tidak ditemukan."],
    [/^Due was not found\.?$/i, "Iuran tidak ditemukan."],
    [/^Payment cash transaction was not found\.?$/i, "Transaksi kas pembayaran tidak ditemukan."],
    [/^Reversal reason is required\.?$/i, "Alasan pembatalan wajib diisi."],
    [/^A rejection reason is required\.?$/i, "Alasan penolakan wajib diisi."],
    [/^Authentication is required\.?$/i, "Autentikasi wajib dilakukan."],
    [/^Your session is invalid or expired\.?$/i, "Sesi Anda tidak valid atau sudah berakhir."],
    [/^You do not have permission to perform this action\.?$/i, "Anda tidak memiliki izin untuk melakukan tindakan ini."],
    [/^Invalid request data\.?$/i, "Data permintaan tidak valid."],
    [/^The request conflicts with current data\.?$/i, "Permintaan bertentangan dengan data terbaru."],
    [/^The request could not be processed\.?$/i, "Permintaan tidak dapat diproses."],
    [/^Unable to load the requested data\.?$/i, "Data yang diminta tidak dapat dimuat."],
    [/^Too many requests\. Try again later\.?$/i, "Terlalu banyak permintaan. Coba lagi nanti."],
    [/^The server failed to process the request\.?$/i, "Server gagal memproses permintaan."],
    [/^The service is not ready\.?$/i, "Layanan belum siap."],
  ];
  for (const [pattern, replacement] of translations) if (pattern.test(value)) return replacement;
  if (/^Invalid\b/i.test(value)) return "Data tidak valid.";
  if (/^Unable to\b|^Failed to\b|^Request failed\b/i.test(value)) return "Permintaan tidak dapat diproses.";
  if (/^Only\b/i.test(value)) return "Tindakan ini tidak dapat dilakukan pada data tersebut.";
  if (/\b(required|must be supplied|must be provided)\b/i.test(value)) return "Data wajib diisi atau dilengkapi.";
  if (/\b(cannot|can't|must be|can only|outside|unsupported|not configured|not available)\b/i.test(value)) return "Data tidak memenuhi aturan proses.";
  if (/\bnot found\b/i.test(value)) return "Data yang diminta tidak ditemukan.";
  if (/\balready exists\b/i.test(value)) return "Data tersebut sudah ada.";
  if (/\balready used\b/i.test(value)) return "Data tersebut sudah pernah digunakan.";
  if (/\bexceeds\b/i.test(value)) return "Nilai melebihi batas yang diizinkan.";
  return value;
}

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
  return Response.json({ error: "UNAUTHORIZED", message: "Sesi Anda tidak valid atau sudah berakhir.", diagnostics }, { status: 401, headers: apiDiagnosticHeaders(diagnostics.requestId) });
}

export function apiNotFoundResponse(message: string, requestId?: string) {
  const diagnostics = getApiDiagnostics(requestId);
  return Response.json({ error: "NOT_FOUND", message: localizeApiMessage(message), diagnostics }, { status: 404, headers: apiDiagnosticHeaders(diagnostics.requestId) });
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
    ? validationIssues.map((issue) => `${issue.path.length ? `${issue.path.join(".")}: ` : ""}${localizeApiMessage(issue.message)}`).join(" ")
    : undefined;
  const rawMessage = validationMessage || (error instanceof Error ? error.message : "Data yang diminta tidak dapat dimuat.");
  const message = localizeApiMessage(rawMessage);
  const explicitStatus = typeof error === "object" && error && "status" in error && typeof error.status === "number" ? error.status : undefined;
  const inferredStatus = error instanceof ZodError || error instanceof SyntaxError
    ? 400
    : /already exists|already used|already been finalized|changed by another|exceeds|incomplete and require reconciliation|no block snapshot/i.test(rawMessage)
      ? 409
      : /not found/i.test(rawMessage)
        ? 404
      : /check the|invalid |required\.|must use|unsupported|outside the permitted|must be supplied|monthly payments can only|bukti pembayaran wajib|iuran .* ditetapkan|\b(wajib|harus|hanya dapat|cannot|requires?)\b/i.test(rawMessage)
          ? 400
          : /storage is not configured|storage is not fully configured/i.test(message)
            ? 503
            : 500;
  const status = [400, 401, 403, 404, 409, 422, 429, 500, 503].includes(explicitStatus ?? -1) ? explicitStatus! : inferredStatus;
  const codeByStatus: Record<number, string> = { 400: "VALIDATION_FAILED", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 409: "CONFLICT", 422: "VALIDATION_FAILED", 429: "RATE_LIMITED", 500: "REQUEST_FAILED", 503: "SERVICE_UNAVAILABLE" };
  const candidateCode = typeof error === "object" && error && "code" in error && typeof error.code === "string" ? error.code : "";
  const code = /^[A-Z][A-Z0-9_]{1,63}$/.test(candidateCode) ? candidateCode : codeByStatus[status] ?? "REQUEST_FAILED";
  const safeMessages: Record<number, string> = { 400: "Data permintaan tidak valid.", 401: "Sesi Anda tidak valid atau sudah berakhir.", 403: "Anda tidak memiliki izin untuk melakukan tindakan ini.", 404: "Rute API atau data yang diminta tidak ditemukan. Pastikan Coolify sudah menerapkan commit GitHub terbaru dan URL API mobile sudah benar.", 409: "Permintaan bertentangan dengan data terbaru.", 422: "Permintaan tidak dapat diproses.", 429: "Terlalu banyak permintaan. Coba lagi nanti.", 500: "Server gagal memproses permintaan. Periksa log Coolify, koneksi database, dan migrasi.", 503: "Layanan belum siap. Coolify mungkin sedang melakukan redeploy, migrasi masih berjalan, atau database tidak tersedia." };
  const diagnostics = getApiDiagnostics();
  const safeDomainMessage = error instanceof Error && !(error instanceof SyntaxError) && !(error instanceof ZodError) && message.length <= 500 && !/(mysql|sql|password|secret|ER_[A-Z_]+|ECONN|ENOENT|stack trace)/i.test(message);
  const response = { error: code, message: validationMessage || (status < 500 && safeDomainMessage ? message : safeMessages[status] ?? safeMessages[500]), diagnostics } as { error: string; message: string; fields?: Record<string, string>; diagnostics: ApiDiagnostics };
  if (status === 400 && validationIssues.length) {
    response.fields = Object.fromEntries(validationIssues.filter((issue) => issue.path.length).map((issue) => [issue.path.join("."), localizeApiMessage(issue.message)]));
  }
  return Response.json(response, { status, headers: apiDiagnosticHeaders(diagnostics.requestId) });
}
