import { addBlockPhoto, archiveBlockRecord, createBlockPhotoUploadUrl, createBlockRecord, getBlockPhotoDownloadUrl, updateBlockRecord } from "@/src/features/blocks/actions";
import { addBudgetCategoryToPeriod, addBudgetItemAttachment, addRealizationEvidence, approveBudgetPeriod, createBudgetCategory, createBudgetItem, createBudgetItemAttachmentUploadUrl, createBudgetPeriod, createBudgetSubcategory, createRealization, createRealizationEvidenceUploadUrl, correctRealization, deleteBudgetItem, getBudgetItemAttachmentDownloadUrl, getRealizationEvidenceDownloadUrl, reviseBudgetItem, reverseRealization, transitionRealization, updateBudgetCategory, updateBudgetItem, updateBudgetSubcategory, updateRealization, verifyBudgetPeriod } from "@/src/features/budgets/service";
import { approveFinancialTransaction, createFinanceCategory, createFinancialTransaction, createFinancialTransactionUploadUrl, getFinancialTransactionEvidenceDownloadUrl, reverseFinancialTransaction, updateFinanceCategory } from "@/src/features/finance/service";
import { recordExcavatorMovement, registerExcavator, updateExcavator } from "@/src/features/excavators/service";
import { createInspection, createInspectionUploadUrl, finalizeInspection, getInspectionPhotoDownloadUrl, saveInspectionDraft } from "@/src/features/inspections/service";
import { createDue, createDuePaymentUploadUrl, getDuePaymentEvidenceDownloadUrl, recordDuePayment, reverseDuePayment } from "@/src/features/dues/service";
import { createBlockFieldAssignment, createBusinessActor, createDuePaymentVerificationUploadUrl, endBlockFieldAssignment, updateBusinessActor, verifyDuePayment } from "@/src/features/field-operations/service";
import { addDailyInformationAttachment, addDailyInformationFollowUp, createDailyInformation, createDailyInformationAttachmentUploadUrl, getDailyInformationAttachmentDownloadUrl, transitionDailyInformation } from "@/src/features/daily-information/service";
import { assignWorkerToBlock, createFieldTask, createFieldWorker, endWorkerBlockAssignment, updateFieldTask, updateFieldWorker } from "@/src/features/field-work/service";
import { addFundRequestAttachment, correctFundRequest, createFundRequest, createFundRequestAttachmentUploadUrl, getFundRequestAttachmentDownloadUrl, transitionFundRequest, updateFundRequest } from "@/src/features/fund-requests/service";
import { apiErrorResponse, withMobileSession } from "@/src/lib/mobile-api";

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

export async function POST(request: Request) {
  return withMobileSession(request, async () => {
    try {
      const body = await request.json() as { action?: string; input?: unknown };
      if (!body.action || !actions[body.action]) return Response.json({ error: "VALIDATION_FAILED", message: "Unsupported workflow action." }, { status: 400 });
      return Response.json({ data: await actions[body.action](body.input) });
    } catch (error) { return apiErrorResponse(error); }
  });
}
