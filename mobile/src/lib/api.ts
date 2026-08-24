import * as SecureStore from "expo-secure-store";

import type { Block, BlockDetails, DashboardResponse, FieldAssignmentItem, NotificationItem, Profile, Session } from "../types";

const TOKEN_KEY = "satgas.mobile.session-token";
const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");

export async function getToken() { return SecureStore.getItemAsync(TOKEN_KEY); }
export async function saveToken(token: string) { return SecureStore.setItemAsync(TOKEN_KEY, token); }
export async function clearToken() { return SecureStore.deleteItemAsync(TOKEN_KEY); }

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { Accept: "application/json", ...(init?.body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  if (!response.ok) {
    if (response.status === 401) await clearToken();
    const body = await response.json().catch(() => null) as { message?: string } | null;
    const error = new Error(body?.message ?? (response.status === 401 ? "Sesi Anda telah berakhir." : "Tidak dapat terhubung ke server."));
    Object.assign(error, { status: response.status });
    throw error;
  }
  return response.json() as Promise<T>;
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
export function getDailyInformationAttachmentDownloadUrl(input: unknown) { return workflow<Record<string, unknown>>("getDailyInformationAttachmentDownloadUrl", input); }
export function registerExcavator(input: unknown) { return workflow<Record<string, unknown>>("registerExcavator", input); }
export function updateExcavator(input: unknown) { return workflow<Record<string, unknown>>("updateExcavator", input); }
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
export function transitionFundRequest(input: unknown) { return workflow<{ id: string; status: string }>("transitionFundRequest", input); }
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
export function createFinancialTransaction(input: unknown) { return workflow<Record<string, unknown>>("createFinancialTransaction", input); }
export function createFinancialTransactionUploadUrl(input: unknown) { return workflow<{ key: string; uploadUrl: string }>("createFinancialTransactionUploadUrl", input); }
export function getFinancialTransactionEvidenceDownloadUrl(input: unknown) { return workflow<{ downloadUrl: string }>("getFinancialTransactionEvidenceDownloadUrl", input); }
export function approveFinancialTransaction(input: unknown) { return workflow<Record<string, unknown>>("approveFinancialTransaction", input); }
export function reverseFinancialTransaction(input: unknown) { return workflow<Record<string, unknown>>("reverseFinancialTransaction", input); }
export function createFinanceCategory(input: unknown) { return workflow<{ id: string }>("createFinanceCategory", input); }
export function updateFinanceCategory(input: unknown) { return workflow<{ id: string }>("updateFinanceCategory", input); }
export function getDue(id: string) { return request<{ due: Record<string, unknown> }>(`/api/mobile/dues/${id}`); }

export async function login(email: string, password: string) {
  const response = await fetch(`${baseUrl}/api/auth/sign-in/email`, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ email, password }) });
  const token = response.headers.get("set-auth-token");
  const body = await response.json().catch(() => null) as { message?: string } | null;
  if (!response.ok || !token) throw new Error(body?.message ?? "Email atau kata sandi tidak valid.");
  await saveToken(token);
  return getSession();
}

export function getSession() { return request<Session>("/api/mobile/session"); }
export function getProfile() { return request<{ profile: Profile }>("/api/mobile/profile"); }
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
export function getBudget(id: string) { return request<Record<string, unknown>>(`/api/mobile/budgets/${id}`); }
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
export function createAdminUser(input: { name: string; email: string; roleId: string }) { return request<{ error: string | null; success: string | null }>("/api/mobile/admin/users", { method: "POST", body: JSON.stringify(input) }); }
export function updateAdminUser(id: string, input: { status?: string; roleId?: string }) { return request<{ updated: boolean }>(`/api/mobile/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(input) }); }
export function getSystemSettings() { return request<{ settings: Record<string, unknown> }>("/api/mobile/admin/settings"); }
export function updateSystemSettings(input: Record<string, unknown>) { return request<{ settings: Record<string, unknown> }>("/api/mobile/admin/settings", { method: "PATCH", body: JSON.stringify(input) }); }
export function apiBaseUrl() { return baseUrl; }
export function getInspections(filters?: Record<string, string>) { return request<{ inspections: Array<Record<string, unknown>> }>(`/api/mobile/inspections${queryString(filters)}`); }
export function getTransactions() { return request<{ transactions: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>("/api/mobile/transactions"); }
export function getTransactionsFiltered(filters: Record<string, string>) { return request<{ transactions: Array<Record<string, unknown>>; pagination?: Record<string, unknown> }>(`/api/mobile/transactions${queryString(filters)}`); }
export function getTransaction(id: string) { return request<{ item: Record<string, unknown> }>(`/api/mobile/transactions/${id}`); }
export function getFinanceCategories(filters?: Record<string, string>) { return request<{ categories: Array<Record<string, unknown>> }>(`/api/mobile/finance-categories${queryString(filters)}`); }
export function getFinanceSummary() { return request<{ summary: Record<string, unknown> }>("/api/mobile/finance/summary"); }

function queryString(filters?: Record<string, string>) { if (!filters) return ""; const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value))); return params.size ? `?${params}` : ""; }
