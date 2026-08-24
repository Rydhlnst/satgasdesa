import { z } from "zod";

import { FINANCIAL_TRANSACTION_STATUSES, FINANCIAL_TRANSACTION_TYPES } from "./constants";

const uuid = z.string().uuid("Invalid ID.");

export const financialTransactionIdSchema = uuid;
export const createFinancialTransactionSchema = z.object({
  idempotencyKey: uuid,
  transactionAt: z.coerce.date().optional(),
  transactionType: z.enum(FINANCIAL_TRANSACTION_TYPES),
  amount: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  description: z.string().trim().min(1, "Description is required.").max(10000),
  categoryId: uuid.optional(),
  relatedEntityType: z.string().trim().max(64).optional(),
  relatedEntityId: uuid.optional(),
  evidenceKey: z.string().trim().max(255).optional(),
}).superRefine((value, context) => {
  if (Boolean(value.relatedEntityType) !== Boolean(value.relatedEntityId)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Related entity type and ID must be provided together.", path: [value.relatedEntityType ? "relatedEntityId" : "relatedEntityType"] });
  }
});

export const financialTransactionFiltersSchema = z.object({
  status: z.enum(FINANCIAL_TRANSACTION_STATUSES).optional(),
  transactionType: z.enum(FINANCIAL_TRANSACTION_TYPES).optional(),
  relatedEntityType: z.string().trim().max(64).optional(),
  categoryId: uuid.optional(),
  query: z.string().trim().max(100).optional(),
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const approveFinancialTransactionSchema = z.object({ id: financialTransactionIdSchema });
export const reverseFinancialTransactionSchema = z.object({
  id: financialTransactionIdSchema,
  reason: z.string().trim().min(1, "Reversal reason is required.").max(5000),
});

export const financialTransactionUploadSchema = z.object({
  transactionId: uuid,
  contentType: z.string().trim().min(1).max(100),
  size: z.coerce.number().int().positive().max(10 * 1024 * 1024),
  originalName: z.string().trim().min(1).max(255),
});

export const financialTransactionEvidenceDownloadSchema = z.object({ id: financialTransactionIdSchema });

export const financeCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(160),
  transactionType: z.enum(FINANCIAL_TRANSACTION_TYPES),
  sortOrder: z.coerce.number().int().min(0).max(10000).default(0),
});

export const updateFinanceCategorySchema = financeCategorySchema.extend({
  id: uuid,
  isActive: z.coerce.boolean(),
});

export const financeCategoryFiltersSchema = z.object({
  transactionType: z.enum(FINANCIAL_TRANSACTION_TYPES).optional(),
  includeInactive: z.coerce.boolean().default(false),
  query: z.string().trim().max(100).optional(),
});
