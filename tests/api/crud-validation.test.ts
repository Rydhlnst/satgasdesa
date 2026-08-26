import { describe, expect, it } from "vitest";

import { addBlockPhotoSchema, blockArchiveSchema, blockFormSchema, blockPhotoUploadSchema } from "@/src/features/blocks/schema";
import { assignBlockManagerSchema, closeBlockManagerSchema } from "@/src/features/block-managers/schema";
import { addBudgetCategoryToPeriodSchema, addBudgetItemAttachmentSchema, addRealizationEvidenceSchema, approveBudgetPeriodSchema, createBudgetCategorySchema, createBudgetItemSchema, createBudgetPeriodSchema, createBudgetSubcategorySchema, createRealizationSchema, deleteBudgetItemSchema, reviseBudgetItemSchema, transitionRealizationSchema, updateBudgetCategorySchema, updateBudgetItemSchema, updateBudgetSubcategorySchema, updateRealizationSchema, verifyBudgetPeriodSchema, budgetItemAttachmentUploadSchema, correctRealizationSchema, reverseRealizationSchema, realizationEvidenceUploadSchema } from "@/src/features/budgets/schema";
import { addDailyInformationAttachmentSchema, addDailyInformationFollowUpSchema, createDailyInformationSchema, dailyInformationAttachmentUploadSchema, transitionDailyInformationSchema } from "@/src/features/daily-information/schema";
import { createDueSchema, duePaymentUploadSchema, recordDuePaymentSchema, reverseDuePaymentSchema } from "@/src/features/dues/schema";
import { excavatorPhotoUploadSchema, recordExcavatorMovementSchema, registerExcavatorSchema, setExcavatorPhotoSchema, updateExcavatorSchema } from "@/src/features/excavators/schema";
import { businessActorSchema, endFieldAssignmentSchema, fieldAssignmentSchema, paymentVerificationSchema, paymentVerificationUploadSchema, updateBusinessActorSchema } from "@/src/features/field-operations/schema";
import { endWorkerAssignmentSchema, fieldTaskSchema, fieldWorkerSchema, updateFieldTaskSchema, updateFieldWorkerSchema, workerAssignmentSchema } from "@/src/features/field-work/schema";
import { approveFinancialTransactionSchema, createFinancialTransactionSchema, financeCategorySchema, financialTransactionUploadSchema, reverseFinancialTransactionSchema, updateFinanceCategorySchema } from "@/src/features/finance/schema";
import { addFundRequestAttachmentSchema, correctFundRequestSchema, createFundRequestSchema, fundRequestAttachmentUploadSchema, transitionFundRequestSchema, updateFundRequestSchema } from "@/src/features/fund-requests/schema";
import { createInspectionSchema, inspectionPhotoInputSchema, inspectionUploadSchema } from "@/src/features/inspections/schema";
import { updateSystemSettingsSchema } from "@/src/features/settings/service";
import { updateMyProfileSchema } from "@/src/features/profile/schema";

const writeSchemas: Array<[string, { safeParse: (value: unknown) => { success: boolean } }]> = [
  ["block create", blockFormSchema], ["block archive", blockArchiveSchema], ["block photo upload", blockPhotoUploadSchema], ["block photo add", addBlockPhotoSchema],
  ["block manager assign", assignBlockManagerSchema], ["block manager close", closeBlockManagerSchema],
  ["budget period create", createBudgetPeriodSchema], ["budget category create", createBudgetCategorySchema], ["budget category update", updateBudgetCategorySchema], ["budget subcategory create", createBudgetSubcategorySchema], ["budget subcategory update", updateBudgetSubcategorySchema], ["budget category assignment", addBudgetCategoryToPeriodSchema], ["budget item create", createBudgetItemSchema], ["budget item update", updateBudgetItemSchema], ["budget item revise", reviseBudgetItemSchema], ["budget item delete", deleteBudgetItemSchema], ["budget attachment upload", budgetItemAttachmentUploadSchema], ["budget attachment add", addBudgetItemAttachmentSchema], ["budget verify", verifyBudgetPeriodSchema], ["budget approve", approveBudgetPeriodSchema], ["realization create", createRealizationSchema], ["realization update", updateRealizationSchema], ["realization transition", transitionRealizationSchema], ["realization correct", correctRealizationSchema], ["realization reverse", reverseRealizationSchema], ["realization evidence upload", realizationEvidenceUploadSchema], ["realization evidence add", addRealizationEvidenceSchema],
  ["daily information create", createDailyInformationSchema], ["daily information transition", transitionDailyInformationSchema], ["daily information follow-up", addDailyInformationFollowUpSchema], ["daily information attachment", addDailyInformationAttachmentSchema], ["daily information attachment upload", dailyInformationAttachmentUploadSchema],
  ["due create", createDueSchema], ["due payment record", recordDuePaymentSchema], ["due payment upload", duePaymentUploadSchema], ["due payment reverse", reverseDuePaymentSchema],
  ["excavator register", registerExcavatorSchema], ["excavator update", updateExcavatorSchema], ["excavator photo upload", excavatorPhotoUploadSchema], ["excavator photo set", setExcavatorPhotoSchema], ["excavator movement", recordExcavatorMovementSchema],
  ["business actor create", businessActorSchema], ["business actor update", updateBusinessActorSchema], ["field assignment create", fieldAssignmentSchema], ["field assignment end", endFieldAssignmentSchema], ["payment verification", paymentVerificationSchema], ["payment verification upload", paymentVerificationUploadSchema],
  ["worker create", fieldWorkerSchema], ["worker update", updateFieldWorkerSchema], ["worker assignment", workerAssignmentSchema], ["worker assignment end", endWorkerAssignmentSchema], ["task create", fieldTaskSchema], ["task update", updateFieldTaskSchema],
  ["transaction create", createFinancialTransactionSchema], ["transaction approve", approveFinancialTransactionSchema], ["transaction reverse", reverseFinancialTransactionSchema], ["transaction evidence upload", financialTransactionUploadSchema], ["finance category create", financeCategorySchema], ["finance category update", updateFinanceCategorySchema],
  ["fund request create", createFundRequestSchema], ["fund request update", updateFundRequestSchema], ["fund request transition", transitionFundRequestSchema], ["fund request correct", correctFundRequestSchema], ["fund attachment upload", fundRequestAttachmentUploadSchema], ["fund attachment add", addFundRequestAttachmentSchema],
  ["inspection create", createInspectionSchema], ["inspection photo", inspectionPhotoInputSchema], ["inspection upload", inspectionUploadSchema], ["profile update", updateMyProfileSchema], ["system settings update", updateSystemSettingsSchema],
];

describe("CRUD server-side validation", () => {
  it.each(writeSchemas)("rejects an empty payload for %s", (_name, schema) => {
    expect(schema.safeParse({}).success).toBe(false);
  });

  it("rejects unsafe numeric and date boundaries", () => {
    expect(createBudgetPeriodSchema.safeParse({ periodKey: "2026-13", openingBalance: 0, estimatedIncome: 0 }).success).toBe(false);
    expect(createBudgetCategorySchema.safeParse({ name: " ", sortOrder: -1 }).success).toBe(false);
    expect(updateMyProfileSchema.safeParse({ name: "A", phone: "1" }).success).toBe(false);
  });

  it("accepts a complete block record with blank optional fields", () => {
    const result = blockFormSchema.safeParse({
      code: "BLK-001",
      name: "Blok Utara",
      status: "NOT_OPERATING",
      latitude: "-6.2",
      longitude: "106.8166667",
      areaHectares: "",
      workerCount: "",
      operationalCondition: "Belum beroperasi",
      startDate: "",
      notes: "",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.workerCount).toBe(0);
  });

  it("rejects invalid block location and operational condition values", () => {
    const base = { code: "BLK-001", name: "Blok Utara", status: "ACTIVE", latitude: "-6.2", longitude: "106.8", workerCount: "0", operationalCondition: "Normal" };
    expect(blockFormSchema.safeParse({ ...base, latitude: "" }).success).toBe(false);
    expect(blockFormSchema.safeParse({ ...base, longitude: "181" }).success).toBe(false);
    expect(blockFormSchema.safeParse({ ...base, operationalCondition: "   " }).success).toBe(false);
    expect(blockFormSchema.safeParse({ ...base, startDate: "2026/01/01" }).success).toBe(false);
  });
});
