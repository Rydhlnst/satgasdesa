import { z } from "zod";

import { BUDGET_PERIOD_STATUSES } from "./constants";
import { dateRangeFields, validateDateRange } from "@/src/lib/date-range";

const uuid = z.string().uuid("Invalid ID.");
const money = z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const budgetPeriodIdSchema = uuid;
export const budgetItemIdSchema = uuid;
export const budgetCategoryIdSchema = uuid;
export const budgetSubcategoryIdSchema = uuid;
const activeFlag = z.coerce.boolean().default(true);
export const budgetPeriodFiltersSchema = z.object({
  status: z.enum(BUDGET_PERIOD_STATUSES).optional(),
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  query: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const createBudgetPeriodSchema = z.object({ periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), openingBalance: money, estimatedIncome: money });
export const budgetCategoryFiltersSchema = z.object({
  categoryId: budgetCategoryIdSchema.optional(),
  includeInactive: z.coerce.boolean().default(false),
  query: z.string().trim().max(100).optional(),
});
export const createBudgetCategorySchema = z.object({ name: z.string().trim().min(1).max(160), sortOrder: z.coerce.number().int().min(0).max(10_000).default(0) });
export const updateBudgetCategorySchema = createBudgetCategorySchema.extend({ id: budgetCategoryIdSchema, isActive: activeFlag });
export const createBudgetSubcategorySchema = z.object({ categoryId: budgetCategoryIdSchema, name: z.string().trim().min(1).max(160), sortOrder: z.coerce.number().int().min(0).max(10_000).default(0) });
export const updateBudgetSubcategorySchema = createBudgetSubcategorySchema.extend({ id: budgetSubcategoryIdSchema, isActive: activeFlag });
export const addBudgetCategoryToPeriodSchema = z.object({ periodId: budgetPeriodIdSchema, categoryId: budgetCategoryIdSchema });
export const createBudgetItemSchema = z.object({ groupId: uuid, subcategoryId: budgetSubcategoryIdSchema.optional(), name: z.string().trim().min(1).max(255), allocatedAmount: money, notes: z.string().trim().max(5000).optional() });
export const updateBudgetItemSchema = z.object({ id: budgetItemIdSchema, subcategoryId: budgetSubcategoryIdSchema.optional(), name: z.string().trim().min(1).max(255), allocatedAmount: money, notes: z.string().trim().max(5000).optional() });
export const reviseBudgetItemSchema = z.object({ id: budgetItemIdSchema, allocatedAmount: money, reason: z.string().trim().min(1).max(5000) });
export const deleteBudgetItemSchema = z.object({ id: budgetItemIdSchema });
export const budgetItemAttachmentUploadSchema = z.object({ budgetItemId: budgetItemIdSchema, contentType: z.string().trim().min(1).max(100), size: z.coerce.number().int().positive().max(10 * 1024 * 1024), originalName: z.string().trim().min(1).max(255) });
export const addBudgetItemAttachmentSchema = z.object({ budgetItemId: budgetItemIdSchema, storageKey: z.string().trim().min(1).max(255), contentType: z.string().trim().min(1).max(100), sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024), caption: z.string().trim().max(255).optional() });
export const budgetItemAttachmentDownloadSchema = z.object({ budgetItemId: budgetItemIdSchema, attachmentId: uuid });
export const approveBudgetPeriodSchema = z.object({ id: uuid, approvalNotes: z.string().trim().max(5000).optional() });
export const verifyBudgetPeriodSchema = z.object({ id: budgetPeriodIdSchema, notes: z.string().trim().max(5000).optional() });
const realizationFields = z.object({ budgetItemId: uuid, fundRequestId: uuid.optional(), activity: z.string().trim().min(1).max(255), realizationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD."), requestedAmount: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER), description: z.string().trim().min(1).max(10000), receiptNumber: z.string().trim().max(100).optional(), evidenceKey: z.string().trim().max(255).optional() });
export const createRealizationSchema = realizationFields;
export const updateRealizationSchema = realizationFields.extend({ id: uuid });
export const realizationFiltersSchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED", "VERIFIED", "SAH", "REVISION_REQUIRED", "REJECTED", "CANCELLED", "REVERSED"]).optional(),
  budgetItemId: uuid.optional(),
  categoryId: uuid.optional(),
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  query: z.string().trim().max(100).optional(),
  ...dateRangeFields,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}).superRefine(validateDateRange);
export const transitionRealizationSchema = z.object({ id: uuid, status: z.enum(["SUBMITTED", "VERIFIED", "SAH", "REVISION_REQUIRED", "REJECTED", "CANCELLED"]), notes: z.string().trim().max(5000).optional() });
export const correctRealizationSchema = realizationFields.extend({ id: uuid, reason: z.string().trim().min(1).max(5000) });
export const reverseRealizationSchema = z.object({ id: uuid, reason: z.string().trim().min(1).max(5000) });
export const realizationEvidenceUploadSchema = z.object({ realizationId: uuid, contentType: z.string().trim().min(1).max(100), size: z.coerce.number().int().positive().max(10 * 1024 * 1024), originalName: z.string().trim().min(1).max(255) });
export const addRealizationEvidenceSchema = z.object({ realizationId: uuid, storageKey: z.string().trim().min(1).max(255), contentType: z.string().trim().min(1).max(100), sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024), caption: z.string().trim().max(255).optional() });
export const realizationEvidenceDownloadSchema = z.object({ realizationId: uuid, evidenceId: uuid });
