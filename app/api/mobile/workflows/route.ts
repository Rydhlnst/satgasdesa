import { addBlockPhoto, archiveBlockRecord, createBlockPhotoUploadUrl, createBlockRecord, getBlockPhotoDownloadUrl, updateBlockRecord } from "@/src/features/blocks/actions";
import { addBudgetCategoryToPeriod, addBudgetItemAttachment, addRealizationEvidence, approveBudgetPeriod, createBudgetCategory, createBudgetItem, createBudgetItemAttachmentUploadUrl, createBudgetPeriod, createBudgetSubcategory, createRealization, createRealizationEvidenceUploadUrl, correctRealization, deleteBudgetItem, getBudgetItemAttachmentDownloadUrl, getRealizationEvidenceDownloadUrl, reviseBudgetItem, reverseRealization, transitionRealization, updateBudgetCategory, updateBudgetItem, updateBudgetItemProgress, updateBudgetSubcategory, updateRealization, verifyBudgetPeriod } from "@/src/features/budgets/service";
import { approveFinancialTransaction, createFinanceCategory, createFinancialTransaction, createFinancialTransactionUploadUrl, getFinancialTransactionEvidenceDownloadUrl, reverseFinancialTransaction, updateFinanceCategory } from "@/src/features/finance/service";
import { createExcavatorPhotoUploadUrl, getExcavatorPhotoDownloadUrl, recordExcavatorMovement, registerExcavator, setExcavatorPhoto, updateExcavator } from "@/src/features/excavators/service";
import { createInspection, createInspectionUploadUrl, finalizeInspection, getInspectionPhotoDownloadUrl, saveInspectionDraft } from "@/src/features/inspections/service";
import { confirmDuePayment, createDue, createDuePaymentUploadUrl, getDuePaymentEvidenceDownloadUrl, recordDuePayment, rejectDuePayment, reverseDuePayment } from "@/src/features/dues/service";
import { createBlockFieldAssignment, createBusinessActor, createDuePaymentVerificationUploadUrl, endBlockFieldAssignment, updateBusinessActor, verifyDuePayment } from "@/src/features/field-operations/service";
import { addDailyInformationAttachment, addDailyInformationFollowUp, createDailyInformation, createDailyInformationAttachmentUploadUrl, getDailyInformationAttachmentDownloadUrl, transitionDailyInformation } from "@/src/features/daily-information/service";
import { assignWorkerToBlock, createFieldTask, createFieldWorker, endWorkerBlockAssignment, updateFieldTask, updateFieldWorker } from "@/src/features/field-work/service";
import { addFundRequestAttachment, correctFundRequest, createFundRequest, createFundRequestAttachmentUploadUrl, getFundRequestAttachmentDownloadUrl, transitionFundRequest, updateFundRequest } from "@/src/features/fund-requests/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";
import { getRequestSession } from "@/src/lib/auth/request-context";
import { hasPermission } from "@/src/lib/permissions/authorize";
import { type Permission } from "@/src/lib/permissions/constants";
import { workflowPermissions } from "@/src/lib/mobile-workflow-policy";
import { checkRateLimit, rateLimitedResponse, requestAddress } from "@/src/lib/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";

const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
  createBlock: createBlockRecord,
  updateBlock: updateBlockRecord,
  archiveBlock: archiveBlockRecord,
  createBlockPhotoUploadUrl,
  addBlockPhoto,
  getBlockPhotoDownloadUrl,
  createFieldTask,
  updateFieldTask,
  createFieldWorker,
  updateFieldWorker,
  assignWorkerToBlock,
  endWorkerBlockAssignment,
  registerExcavator,
  updateExcavator,
  createExcavatorPhotoUploadUrl,
  setExcavatorPhoto,
  getExcavatorPhotoDownloadUrl,
  recordExcavatorMovement,
  createInspection,
  saveInspectionDraft,
  finalizeInspection,
  createInspectionUploadUrl,
  getInspectionPhotoDownloadUrl,
  createDue,
  createDuePaymentUploadUrl,
  getDuePaymentEvidenceDownloadUrl,
  recordDuePayment,
  confirmDuePayment,
  rejectDuePayment,
  reverseDuePayment,
  createBusinessActor,
  updateBusinessActor,
  createBlockFieldAssignment,
  endBlockFieldAssignment,
  verifyDuePayment,
  createDuePaymentVerificationUploadUrl,
  createDailyInformation,
  transitionDailyInformation,
  addDailyInformationFollowUp,
  addDailyInformationAttachment,
  createDailyInformationAttachmentUploadUrl,
  getDailyInformationAttachmentDownloadUrl,
  createFinancialTransaction,
  createFinancialTransactionUploadUrl,
  getFinancialTransactionEvidenceDownloadUrl,
  approveFinancialTransaction,
  reverseFinancialTransaction,
  createFinanceCategory,
  updateFinanceCategory,
  createBudgetPeriod,
  createBudgetCategory,
  updateBudgetCategory,
  createBudgetSubcategory,
  updateBudgetSubcategory,
  addBudgetCategoryToPeriod,
  createBudgetItem,
  updateBudgetItem,
  reviseBudgetItem,
  deleteBudgetItem,
  updateBudgetItemProgress,
  createBudgetItemAttachmentUploadUrl,
  addBudgetItemAttachment,
  getBudgetItemAttachmentDownloadUrl,
  verifyBudgetPeriod,
  approveBudgetPeriod,
  createRealization,
  transitionRealization,
  correctRealization,
  reverseRealization,
  updateRealization,
  createRealizationEvidenceUploadUrl,
  addRealizationEvidence,
  getRealizationEvidenceDownloadUrl,
  createFundRequest,
  updateFundRequest,
  transitionFundRequest,
  correctFundRequest,
  createFundRequestAttachmentUploadUrl,
  addFundRequestAttachment,
  getFundRequestAttachmentDownloadUrl,
};

type WorkflowAction = {
  handler: (input: unknown) => Promise<unknown>;
  inputSchema: z.ZodType;
  requiredPermission: Permission;
  operation: "command" | "media";
};

const workflowInputSchema = z.record(z.string(), z.unknown());
const actions: Record<string, WorkflowAction> = Object.fromEntries(Object.entries(handlers).map(([name, handler]) => {
  const requiredPermission = workflowPermissions[name];
  if (!requiredPermission) throw new Error(`Missing workflow permission metadata for ${name}.`);
  return [name, { handler, inputSchema: workflowInputSchema, requiredPermission, operation: name.includes("UploadUrl") || name.includes("DownloadUrl") ? "media" : "command" }];
}));
const workflowRequestSchema = z.object({ action: z.string().trim().min(1).max(100), input: z.unknown().optional() });

function normalizeMediaUrls(value: unknown, requestUrl: string): unknown {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => normalizeMediaUrls(item, requestUrl));
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if ((key === "uploadUrl" || key === "downloadUrl") && typeof item === "string") return [key, new URL(item, requestUrl).toString()];
    return [key, normalizeMediaUrls(item, requestUrl)];
  }));
}

export async function POST(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const session = getRequestSession();
      const rate = checkRateLimit(`workflow:${session?.user.id ?? requestAddress(request)}`, 120, 60_000);
      if (!rate.allowed) return rateLimitedResponse(rate.retryAfterSeconds);
      const body = workflowRequestSchema.parse(await request.json());
      const action = Object.prototype.hasOwnProperty.call(actions, body.action) ? actions[body.action] : undefined;
      if (!action) return Response.json({ error: "VALIDATION_FAILED", message: "Unsupported workflow action." }, { status: 400 });
      if (!session || !(await hasPermission(session.user.id, action.requiredPermission))) {
        return Response.json({ error: "FORBIDDEN", message: "You do not have permission to perform this action." }, { status: 403 });
      }
      const input = action.inputSchema.parse(body.input ?? {});
      return Response.json({ data: normalizeMediaUrls(await action.handler(input), request.url) });
    } catch (error) { return apiErrorResponse(error); }
  });
}
