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
  query: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const approveFinancialTransactionSchema = z.object({ id: financialTransactionIdSchema });
export const reverseFinancialTransactionSchema = z.object({
  id: financialTransactionIdSchema,
  reason: z.string().trim().min(1, "Reversal reason is required.").max(5000),
});
