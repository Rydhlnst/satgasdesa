import { addBlockPhoto, archiveBlockRecord, createBlockPhotoUploadUrl, createBlockRecord, getBlockPhotoDownloadUrl, updateBlockRecord } from "@/src/features/blocks/actions";
import { addBudgetCategoryToPeriod, addBudgetItemAttachment, addRealizationEvidence, approveBudgetPeriod, createBudgetCategory, createBudgetItem, createBudgetItemAttachmentUploadUrl, createBudgetPeriod, createBudgetSubcategory, createRealization, createRealizationEvidenceUploadUrl, correctRealization, deleteBudgetItem, getBudgetItemAttachmentDownloadUrl, getRealizationEvidenceDownloadUrl, reviseBudgetItem, reverseRealization, transitionRealization, updateBudgetCategory, updateBudgetItem, updateBudgetSubcategory, updateRealization, verifyBudgetPeriod } from "@/src/features/budgets/service";
import { approveFinancialTransaction, createFinanceCategory, createFinancialTransaction, createFinancialTransactionUploadUrl, getFinancialTransactionEvidenceDownloadUrl, reverseFinancialTransaction, updateFinanceCategory } from "@/src/features/finance/service";
import { createExcavatorPhotoUploadUrl, getExcavatorPhotoDownloadUrl, recordExcavatorMovement, registerExcavator, setExcavatorPhoto, updateExcavator } from "@/src/features/excavators/service";
import { createInspection, createInspectionUploadUrl, finalizeInspection, getInspectionPhotoDownloadUrl, saveInspectionDraft } from "@/src/features/inspections/service";
import { createDue, createDuePaymentUploadUrl, getDuePaymentEvidenceDownloadUrl, recordDuePayment, reverseDuePayment } from "@/src/features/dues/service";
import { createBlockFieldAssignment, createBusinessActor, createDuePaymentVerificationUploadUrl, endBlockFieldAssignment, updateBusinessActor, verifyDuePayment } from "@/src/features/field-operations/service";
import { addDailyInformationAttachment, addDailyInformationFollowUp, createDailyInformation, createDailyInformationAttachmentUploadUrl, getDailyInformationAttachmentDownloadUrl, transitionDailyInformation } from "@/src/features/daily-information/service";
import { assignWorkerToBlock, createFieldTask, createFieldWorker, endWorkerBlockAssignment, updateFieldTask, updateFieldWorker } from "@/src/features/field-work/service";
import { addFundRequestAttachment, correctFundRequest, createFundRequest, createFundRequestAttachmentUploadUrl, getFundRequestAttachmentDownloadUrl, transitionFundRequest, updateFundRequest } from "@/src/features/fund-requests/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";
import { z } from "zod";

export const dynamic = "force-dynamic";

const actions: Record<string, (input: unknown) => Promise<unknown>> = {
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
      const body = workflowRequestSchema.parse(await request.json());
      const handler = Object.prototype.hasOwnProperty.call(actions, body.action) ? actions[body.action] : undefined;
      if (!handler) return Response.json({ error: "VALIDATION_FAILED", message: "Unsupported workflow action." }, { status: 400 });
      return Response.json({ data: normalizeMediaUrls(await handler(body.input), request.url) });
    } catch (error) { return apiErrorResponse(error); }
  });
}
