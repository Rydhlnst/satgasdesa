import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

import { getActiveDateRange } from "../date-range";
import { createClientId } from "./id";
import { PRODUCTION_API_URL, resolveMobileApiUrl } from "./api-config";
import type { Block, BlockDetails, DashboardResponse, FieldAssignmentItem, NotificationItem, Profile, Session } from "../types";

const TOKEN_KEY = "satgas.mobile.session-token";
const REQUEST_TIMEOUT_MS = 15_000;
const isProductionEasBuild = Boolean(process.env.EAS_BUILD && ["production-apk", "production"].includes(process.env.EAS_BUILD_PROFILE ?? ""));
const configuredApiUrl = typeof Constants.expoConfig?.extra?.apiUrl === "string"
  ? Constants.expoConfig.extra.apiUrl
  : PRODUCTION_API_URL;
const baseUrl = resolveMobileApiUrl({ isProductionBuild: isProductionEasBuild, configuredApiUrl });
const authOrigin = baseUrl === PRODUCTION_API_URL
  ? PRODUCTION_API_URL
  : resolveMobileApiUrl({ isProductionBuild: isProductionEasBuild, configuredApiUrl: process.env.EXPO_PUBLIC_AUTH_ORIGIN?.trim() || baseUrl });

type ErrorDiagnostics = { requestId?: string; appRevision?: string };
type ErrorBody = { error?: string; message?: string; fields?: Record<string, string>; diagnostics?: ErrorDiagnostics };
type AuthResponse = ErrorBody & { token?: string | null };

export type MobileApiError = Error & { status?: number; code?: string; fields?: Record<string, string>; requestId?: string; appRevision?: string; userMessage?: string };

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) return null;
  return response.json().catch(() => null);
}

function diagnosticSuffix(response: Response, body: ErrorBody | null, clientRequestId?: string) {
  const requestId = response.headers.get("x-request-id") || body?.diagnostics?.requestId || clientRequestId || "tidak tersedia";
  const appRevision = response.headers.get("x-app-revision") || body?.diagnostics?.appRevision || "tidak diketahui";
  return `Detail teknis: HTTP ${response.status}${body?.error ? ` · ${body.error}` : ""} · ID ${requestId} · revisi server ${appRevision}.`;
}

function apiError(response: Response, body: ErrorBody | null, clientRequestId?: string): MobileApiError {
  if (__DEV__) console.warn("[mobile-api]", response.status, response.url, body?.error ?? "UNKNOWN_ERROR");
  const fallbackMessage = response.status === 404
    ? "API route atau data tidak ditemukan. Kemungkinan aplikasi mobile lebih baru daripada server, Coolify belum redeploy dari commit GitHub terbaru, atau URL API salah."
    : response.status === 503
      ? "Server belum siap. Coolify mungkin sedang redeploy, migrasi database belum selesai, atau database tidak tersedia."
      : response.status >= 500
        ? "Server gagal memproses permintaan. Periksa log Coolify, status database, dan migrasi deployment terbaru."
        : response.status === 401
          ? "Sesi Anda telah berakhir."
          : "Tidak dapat terhubung ke server.";
  const userMessage = body?.message?.trim() || fallbackMessage;
  const message = `${userMessage} ${diagnosticSuffix(response, body, clientRequestId)}`;
  const error = new Error(message) as MobileApiError;
  Object.assign(error, { status: response.status, code: body?.error, fields: body?.fields, userMessage, requestId: response.headers.get("x-request-id") || body?.diagnostics?.requestId || clientRequestId, appRevision: response.headers.get("x-app-revision") || body?.diagnostics?.appRevision });
  return error;
}

async function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit, clientRequestId?: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: init?.signal ?? controller.signal });
  } catch (error) {
    const detail = `Detail teknis: ID ${clientRequestId ?? "tidak tersedia"}.`;
    if (error instanceof Error && error.name === "AbortError") throw new Error(`Server tidak merespons dalam ${REQUEST_TIMEOUT_MS / 1000} detik. Periksa status Coolify/redeploy dan koneksi internet. ${detail}`);
    throw new Error(`Tidak dapat terhubung ke API. Periksa internet, URL server, DNS/HTTPS, dan status Coolify. ${detail}`);
  } finally {
    clearTimeout(timeout);
  }
}

export async function getToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function saveToken(token: string) { return SecureStore.setItemAsync(TOKEN_KEY, token); }
export async function clearToken() { return SecureStore.deleteItemAsync(TOKEN_KEY); }

export function getMobileApiBaseUrl() { return baseUrl; }
export { PRODUCTION_API_URL };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const clientRequestId = createClientId();
  const method = (init?.method ?? "GET").toUpperCase();
  const url = new URL(`${baseUrl}${path}`);
  if (method === "GET") {
    const range = getActiveDateRange();
    if (!url.searchParams.has("dateFrom")) url.searchParams.set("dateFrom", range.dateFrom);
    if (!url.searchParams.has("dateTo")) url.searchParams.set("dateTo", range.dateTo);
  }
  const response = await fetchWithTimeout(url, {
    ...init,
    headers: { Accept: "application/json", "X-Client-Request-ID": clientRequestId, ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  }, clientRequestId);
  if (!response.ok) {
    if (response.status === 401) await clearToken();
    throw apiError(response, await readJson(response) as ErrorBody | null, clientRequestId);
  }
  const body = await readJson(response);
  if (body === null) throw new Error(`Server mengembalikan respons non-JSON atau kosong. Kemungkinan URL API salah atau deployment Coolify belum aktif. Detail teknis: HTTP ${response.status} · ID ${clientRequestId} · revisi server ${response.headers.get("x-app-revision") ?? "tidak diketahui"}.`);
  return body as T;
}

export function workflow<T>(action: string, input: unknown) {
  return request<{ data: T }>("/api/mobile/workflows", { method: "POST", body: JSON.stringify({ action, input }) }).then((result) => result.data);
}

export function createBlock(input: unknown) { return workflow<Block>("createBlock", input); }
export function createBusinessActor(input: unknown) { return workflow<{ id: string }>("createBusinessActor", input); }
export function updateBusinessActor(input: unknown) { return workflow<{ id: string }>("updateBusinessActor", input); }
export function createBlockFieldAssignment(input: unknown) { return workflow<{ id: string }>("createBlockFieldAssignment", input); }
export function endBlockFieldAssignment(input: unknown) { return workflow<{ id: string }>("endBlockFieldAssignment", input); }
export function verifyDuePayment(input: unknown) { return workflow<{ id: string }>("verifyDuePayment", input); }
export function createDuePaymentVerificationUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string }>("createDuePaymentVerificationUploadUrl", input); }
export function updateBlock(input: unknown) { return workflow<Block>("updateBlock", input); }
export function archiveBlock(input: unknown) { return workflow<Block>("archiveBlock", input); }
export function createBlockPhotoUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string }>("createBlockPhotoUploadUrl", input); }
export function addBlockPhoto(input: unknown) { return workflow<{ id: string }>("addBlockPhoto", input); }
export function getBlockPhotoDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getBlockPhotoDownloadUrl", input); }
export function createFieldTask(input: unknown) { return workflow<Record<string, unknown>>("createFieldTask", input); }
export function updateFieldTask(input: unknown) { return workflow<Record<string, unknown>>("updateFieldTask", input); }
export function createFieldWorker(input: unknown) { return workflow<Record<string, unknown>>("createFieldWorker", input); }
export function updateFieldWorker(input: unknown) { return workflow<Record<string, unknown>>("updateFieldWorker", input); }
export function assignWorkerToBlock(input: unknown) { return workflow<Record<string, unknown>>("assignWorkerToBlock", input); }
export function endWorkerBlockAssignment(input: unknown) { return workflow<Record<string, unknown>>("endWorkerBlockAssignment", input); }
export function recordDuePayment(input: unknown) { return workflow<Record<string, unknown>>("recordDuePayment", input); }
export function confirmDuePayment(input: unknown) { return workflow<Record<string, unknown>>("confirmDuePayment", input); }
export function rejectDuePayment(input: unknown) { return workflow<Record<string, unknown>>("rejectDuePayment", input); }
export function reverseDuePayment(input: unknown) { return workflow<Record<string, unknown>>("reverseDuePayment", input); }
export function createDue(input: unknown) { return workflow<Record<string, unknown>>("createDue", input); }
export function createDuePaymentUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string }>("createDuePaymentUploadUrl", input); }
export function getDuePaymentEvidenceDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getDuePaymentEvidenceDownloadUrl", input); }
export function createInspection(input: unknown) { return workflow<Record<string, unknown>>("createInspection", input); }
export function saveInspectionDraft(input: unknown) { return workflow<Record<string, unknown>>("saveInspectionDraft", input); }
export function finalizeInspection(input: unknown) { return workflow<Record<string, unknown>>("finalizeInspection", input); }
export function createInspectionUploadUrl(input: unknown) { return workflow<Record<string, unknown>>("createInspectionUploadUrl", input); }
export function getInspectionPhotoDownloadUrl(input: unknown) { return workflow<Record<string, unknown>>("getInspectionPhotoDownloadUrl", input); }
export function createDailyInformation(input: unknown) { return workflow<Record<string, unknown>>("createDailyInformation", input); }
export function transitionDailyInformation(input: unknown) { return workflow<Record<string, unknown>>("transitionDailyInformation", input); }
export function addDailyInformationFollowUp(input: unknown) { return workflow<Record<string, unknown>>("addDailyInformationFollowUp", input); }
export function addDailyInformationAttachment(input: unknown) { return workflow<Record<string, unknown>>("addDailyInformationAttachment", input); }
export function createDailyInformationAttachmentUploadUrl(input: unknown) { return workflow<Record<string, unknown>>("createDailyInformationAttachmentUploadUrl", input); }
export function getDailyInformationAttachmentDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getDailyInformationAttachmentDownloadUrl", input); }
export function registerExcavator(input: unknown) { return workflow<Record<string, unknown>>("registerExcavator", input); }
export function updateExcavator(input: unknown) { return workflow<Record<string, unknown>>("updateExcavator", input); }
export function createExcavatorPhotoUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string; contentType: string; sizeBytes: number }>("createExcavatorPhotoUploadUrl", input); }
export function setExcavatorPhoto(input: unknown) { return workflow<{ id: string; photoKey: string }>("setExcavatorPhoto", input); }
export function getExcavatorPhotoDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getExcavatorPhotoDownloadUrl", input); }
export function recordExcavatorMovement(input: unknown) { return workflow<Record<string, unknown>>("recordExcavatorMovement", input); }
export function createRealization(input: unknown) { return workflow<Record<string, unknown>>("createRealization", input); }
export function updateRealization(input: unknown) { return workflow<Record<string, unknown>>("updateRealization", input); }
export function transitionRealization(input: unknown) { return workflow<Record<string, unknown>>("transitionRealization", input); }
export function correctRealization(input: unknown) { return workflow<Record<string, unknown>>("correctRealization", input); }
export function reverseRealization(input: unknown) { return workflow<Record<string, unknown>>("reverseRealization", input); }
export function createRealizationEvidenceUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string }>("createRealizationEvidenceUploadUrl", input); }
export function addRealizationEvidence(input: unknown) { return workflow<{ id: string }>("addRealizationEvidence", input); }
export function getRealizationEvidenceDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getRealizationEvidenceDownloadUrl", input); }
export function createFundRequest(input: unknown) { return workflow<{ id: string; requestNumber: string }>("createFundRequest", input); }
export function updateFundRequest(input: unknown) { return workflow<{ id: string; status: string }>("updateFundRequest", input); }
export function transitionFundRequest(input: unknown) { return workflow<{ id: string; status: string; approval?: { approvedCount: number; requiredCount: number; remainingCount: number; approvedUserIds: string[]; isComplete: boolean } }>("transitionFundRequest", input); }
export function correctFundRequest(input: unknown) { return workflow<{ id: string; requestNumber: string; revisionOfId: string }>("correctFundRequest", input); }
export function createFundRequestAttachmentUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string }>("createFundRequestAttachmentUploadUrl", input); }
export function addFundRequestAttachment(input: unknown) { return workflow<{ id: string }>("addFundRequestAttachment", input); }
export function getFundRequestAttachmentDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getFundRequestAttachmentDownloadUrl", input); }
export function createBudgetPeriod(input: unknown) { return workflow<Record<string, unknown>>("createBudgetPeriod", input); }
export function createBudgetCategory(input: unknown) { return workflow<{ id: string }>("createBudgetCategory", input); }
export function updateBudgetCategory(input: unknown) { return workflow<{ id: string }>("updateBudgetCategory", input); }
export function createBudgetSubcategory(input: unknown) { return workflow<{ id: string }>("createBudgetSubcategory", input); }
export function updateBudgetSubcategory(input: unknown) { return workflow<{ id: string }>("updateBudgetSubcategory", input); }
export function addBudgetCategoryToPeriod(input: unknown) { return workflow<{ id: string }>("addBudgetCategoryToPeriod", input); }
export function createBudgetItem(input: unknown) { return workflow<Record<string, unknown>>("createBudgetItem", input); }
export function updateBudgetItem(input: unknown) { return workflow<Record<string, unknown>>("updateBudgetItem", input); }
export function reviseBudgetItem(input: unknown) { return workflow<Record<string, unknown>>("reviseBudgetItem", input); }
export function deleteBudgetItem(input: unknown) { return workflow<{ id: string }>("deleteBudgetItem", input); }
export function createBudgetItemAttachmentUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string }>("createBudgetItemAttachmentUploadUrl", input); }
export function addBudgetItemAttachment(input: unknown) { return workflow<{ id: string }>("addBudgetItemAttachment", input); }
export function getBudgetItemAttachmentDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getBudgetItemAttachmentDownloadUrl", input); }
export function verifyBudgetPeriod(input: unknown) { return workflow<Record<string, unknown>>("verifyBudgetPeriod", input); }
export function approveBudgetPeriod(input: unknown) { return workflow<Record<string, unknown>>("approveBudgetPeriod", input); }
export function updateBudgetItemProgress(input: unknown) { return workflow<Record<string, unknown>>("updateBudgetItemProgress", input); }
export function createFinancialTransaction(input: unknown) { return workflow<Record<string, unknown>>("createFinancialTransaction", input); }
export function createFinancialTransactionUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string }>("createFinancialTransactionUploadUrl", input); }
export function getFinancialTransactionEvidenceDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getFinancialTransactionEvidenceDownloadUrl", input); }
export function approveFinancialTransaction(input: unknown) { return workflow<Record<string, unknown>>("approveFinancialTransaction", input); }
export function reverseFinancialTransaction(input: unknown) { return workflow<Record<string, unknown>>("reverseFinancialTransaction", input); }
export function createFinanceCategory(input: unknown) { return workflow<{ id: string }>("createFinanceCategory", input); }
export function updateFinanceCategory(input: unknown) { return workflow<{ id: string }>("updateFinanceCategory", input); }
export function getDue(id: string) { return request<{ due: Record<string, unknown> }>(`/api/mobile/dues/${id}`); }

export async function login(email: string, password: string) {
  const clientRequestId = createClientId();
  const response = await fetchWithTimeout(`${baseUrl}/api/auth/sign-in/email`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", Origin: authOrigin, "X-Client-Request-ID": clientRequestId }, body: JSON.stringify({ email, password }) }, clientRequestId);
  const body = await readJson(response) as AuthResponse | null;
  const token = response.headers.get("set-auth-token") || body?.token;
  if (!response.ok) throw apiError(response, body, clientRequestId);
  if (!token) throw new Error(body?.message ?? "Server login tidak mengembalikan sesi yang valid.");
  await saveToken(token);
  return getSession();
}

export type ApiHealth = { status: "ok" | "unavailable"; deployment?: { revision: string; requestId: string }; automation?: { enabled: boolean; configured: boolean } };

export async function getApiHealth(): Promise<ApiHealth> {
  const clientRequestId = createClientId();
  const response = await fetchWithTimeout(`${baseUrl}/api/health`, { headers: { Accept: "application/json", "X-Client-Request-ID": clientRequestId } }, clientRequestId);
  const body = await readJson(response);
  if (!response.ok) throw apiError(response, body as ErrorBody | null, clientRequestId);
  if (!body || typeof body !== "object" || !("status" in body)) throw new Error(`Health endpoint mengembalikan respons tidak valid. Kemungkinan server belum redeploy atau URL API salah. Detail teknis: HTTP ${response.status} · ID ${clientRequestId} · revisi server ${response.headers.get("x-app-revision") ?? "tidak diketahui"}.`);
  return body as ApiHealth;
}

export function getSession() { return request<Session>("/api/mobile/session"); }
export function getProfile() { return request<{ profile: Profile }>("/api/mobile/profile"); }
export function getDueCreationConfig() { return request<{ monthlyDueAmount: number; monthlyDueDay: number }>("/api/mobile/dues/config"); }
export function updateProfile(input: Pick<Profile, "name" | "phone" | "image">) { return request<{ profile: Profile }>("/api/mobile/profile", { method: "PATCH", body: JSON.stringify(input) }); }
export async function changePassword(input: { currentPassword: string; newPassword: string; revokeOtherSessions?: boolean }) {
  const result = await request<{ token?: string | null }>("/api/auth/change-password", { method: "POST", body: JSON.stringify(input) });
  if (result.token) await saveToken(result.token);
  return result;
}
export function requestPasswordReset(email: string) { return request<{ status: boolean }>("/api/auth/request-password-reset", { method: "POST", body: JSON.stringify({ email, redirectTo: "/reset-password" }) }); }
export function getNotifications(filters?: { unreadOnly?: boolean; page?: number; pageSize?: number }) { return request<{ items: NotificationItem[]; total: number }>(`/api/mobile/notifications${queryString({ unreadOnly: filters?.unreadOnly ? "true" : "", page: filters?.page ? String(filters.page) : "", pageSize: filters?.pageSize ? String(filters.pageSize) : "" })}`); }
export function markNotificationRead(id: string) { return request<{ updated: boolean }>(`/api/mobile/notifications/${id}`, { method: "PATCH" }); }
export function markAllNotificationsRead() { return request<{ updated: number }>("/api/mobile/notifications", { method: "PATCH", body: JSON.stringify({ action: "markAllRead" }) }); }
export function registerPushDevice(input: { expoPushToken: string; platform: "android" | "ios" }) { return request<{ registered: boolean }>("/api/mobile/push-devices", { method: "POST", body: JSON.stringify(input) }); }
export function getDashboard(period?: string) { return request<DashboardResponse>(`/api/mobile/dashboard${period ? `?period=${encodeURIComponent(period)}` : ""}`); }
export function getBlocks(search?: string, status?: string, filters?: { priority?: string; includeArchived?: boolean }) {
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (status) params.set("status", status);
  if (filters?.priority) params.set("priority", filters.priority);
  if (filters?.includeArchived) params.set("includeArchived", "true");
  return request<{ blocks: Block[] }>(`/api/mobile/blocks${params.size ? `?${params}` : ""}`);
}
export function getBusinessActors(query?: string) { return request<{ actors: Array<Record<string, unknown>> }>(`/api/mobile/business-actors${query ? `?query=${encodeURIComponent(query)}` : ""}`); }
export function getAssignedBlocks() { return request<{ blocks: Block[]; assignments: FieldAssignmentItem[] }>("/api/mobile/assignments"); }
export function getFieldOfficers() { return request<{ officers: Array<{ id: string; name: string; email: string }> }>("/api/mobile/field-officers"); }
export function getFieldTasks(filters?: Record<string, string>) { return request<{ items: Array<Record<string, unknown>>; page: number; pageSize: number }>(`/api/mobile/tasks${queryString(filters)}`); }
export function getFieldTask(id: string) { return request<{ item: Record<string, unknown> }>(`/api/mobile/tasks/${id}`); }
export function getFieldWorkers(filters?: Record<string, string>) { return request<{ items: Array<Record<string, unknown>>; page: number; pageSize: number }>(`/api/mobile/workers${queryString(filters)}`); }
export function getFieldWorker(id: string) { return request<{ item: Record<string, unknown>; assignments: Array<Record<string, unknown>> }>(`/api/mobile/workers/${id}`); }
export function getBlockReceivables(filters?: Record<string, string>) { return request<{ rows: Array<Record<string, unknown>> }>(`/api/mobile/receivables${queryString(filters)}`); }
export function getBlockDetails(id: string) { return request<BlockDetails>(`/api/mobile/blocks/${id}`); }
export function getExcavators(filters?: string | Record<string, string>) {
  const values = typeof filters === "string" ? { search: filters } : filters;
  return request<{ excavators: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>(`/api/mobile/excavators${queryString(values)}`);
}
export function getExcavator(id: string) { return request<{ item: Record<string, unknown>; movements: Array<Record<string, unknown>> }>(`/api/mobile/excavators/${id}`); }
export function getInspection(id: string) { return request<{ item: Record<string, unknown>; photos: Array<Record<string, unknown>>; events: Array<Record<string, unknown>> }>(`/api/mobile/inspections/${id}`); }
export function getDues() { return request<{ dues: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>("/api/mobile/dues"); }
export function getDuesFiltered(filters: Record<string, string>) { return request<{ dues: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>(`/api/mobile/dues${queryString(filters)}`); }
export function getDuePaymentsFiltered(filters?: Record<string, string>) { return request<{ payments: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>(`/api/mobile/payments${queryString(filters)}`); }
export function getBudgets() { return request<{ budgets: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>("/api/mobile/budgets"); }
export function getBudgetsFiltered(filters: Record<string, string>) { return request<{ budgets: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>(`/api/mobile/budgets${queryString(filters)}`); }
export function getBudget(id: string, view?: "category") { return request<Record<string, unknown>>(`/api/mobile/budgets/${id}${view ? `?view=${view}` : ""}`); }
export function getBudgetCategories(filters?: Record<string, string>) { return request<{ categories: Array<Record<string, unknown>> }>(`/api/mobile/budget-categories${queryString(filters)}`); }
export function getRealizations() { return request<{ realizations: Array<Record<string, unknown>>; statusCounts?: Record<string, number>; pagination?: Record<string, unknown> }>("/api/mobile/realizations"); }
export function getRealizationsFiltered(filters: Record<string, string>) { return request<{ realizations: Array<Record<string, unknown>>; statusCounts?: Record<string, number>; pagination?: Record<string, unknown> }>(`/api/mobile/realizations${queryString(filters)}`); }
export function getRealization(id: string) { return request<Record<string, unknown>>(`/api/mobile/realizations/${id}`); }
export function getFundRequests(filters?: Record<string, string>) { return request<{ items: Array<Record<string, unknown>>; page: number; pageSize: number; total: number; totalPages: number }>(`/api/mobile/fund-requests${queryString(filters)}`); }
export function getFundRequest(id: string) { return request<Record<string, unknown>>(`/api/mobile/fund-requests/${id}`); }
export function getInformation() { return request<{ rows: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>("/api/mobile/information"); }
export function getInformationItem(id: string) { return request<{ item: Record<string, unknown>; followUps: Array<Record<string, unknown>>; attachments: Array<Record<string, unknown>> }>(`/api/mobile/information/${id}`); }
export function getInformationFiltered(filters: Record<string, string>) { return request<{ rows: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>(`/api/mobile/information${queryString(filters)}`); }
export function getReport(period?: string) { return request<{ report: Record<string, unknown> }>(`/api/mobile/reports${period ? `?period=${period}` : ""}`); }
export function getAuditLogs(filters?: Record<string, string>) { return request<{ rows: Array<Record<string, unknown>>; pagination: Record<string, number> }>(`/api/mobile/audit${queryString(filters)}`); }
export function getAdminUsers(filters?: Record<string, string>) { return request<{ users: Array<Record<string, unknown>>; roles: Array<Record<string, unknown>> }>(`/api/mobile/admin/users${queryString(filters)}`); }
export function createAdminUser(input: { name: string; email: string; roleId: string; password: string }) { return request<{ message: string | null; created: boolean }>("/api/mobile/admin/users", { method: "POST", body: JSON.stringify(input) }); }
export function updateAdminUser(id: string, input: { status?: string; roleId?: string }) { return request<{ updated: boolean }>(`/api/mobile/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function getSystemSettings() { return request<{ settings: Record<string, unknown> }>("/api/mobile/admin/settings"); }
export function updateSystemSettings(input: Record<string, unknown>) { return request<{ settings: Record<string, unknown> }>("/api/mobile/admin/settings", { method: "PATCH", body: JSON.stringify(input) }); }
export function apiBaseUrl() { return baseUrl; }
export function apiHost() {
  try { return new URL(baseUrl).host; } catch { return baseUrl; }
}
export function getInspections(filters?: Record<string, string>) { return request<{ inspections: Array<Record<string, unknown>> }>(`/api/mobile/inspections${queryString(filters)}`); }
export function getTransactions() { return request<{ transactions: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>("/api/mobile/transactions"); }
export function getTransactionsFiltered(filters: Record<string, string>) { return request<{ transactions: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>(`/api/mobile/transactions${queryString(filters)}`); }
export function getTransaction(id: string) { return request<{ item: Record<string, unknown> }>(`/api/mobile/transactions/${id}`); }
export function getFinanceCategories(filters?: Record<string, string>) { return request<{ categories: Array<Record<string, unknown>> }>(`/api/mobile/finance-categories${queryString(filters)}`); }
export function getFinanceSummary() { return request<{ summary: Record<string, unknown> }>("/api/mobile/finance/summary"); }

function queryString(filters?: Record<string, string>) { if (!filters) return ""; const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value))); return params.size ? `?${params}` : ""; }
