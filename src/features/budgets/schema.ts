import { z } from "zod";

import { BUDGET_PERIOD_STATUSES } from "./constants";

const uuid = z.string().uuid("Invalid ID.");
const money = z.coerce.number().int().min(0).max(Number.MAX_SAFE_INTEGER);

export const budgetPeriodIdSchema = uuid;
export const budgetItemIdSchema = uuid;
export const budgetPeriodFiltersSchema = z.object({
  status: z.enum(BUDGET_PERIOD_STATUSES).optional(),
  query: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const createBudgetPeriodSchema = z.object({ periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), openingBalance: money, estimatedIncome: money });
export const createBudgetItemSchema = z.object({ groupId: uuid, name: z.string().trim().min(1).max(255), allocatedAmount: money, notes: z.string().trim().max(5000).optional() });
export const updateBudgetItemSchema = z.object({ id: budgetItemIdSchema, name: z.string().trim().min(1).max(255), allocatedAmount: money, notes: z.string().trim().max(5000).optional() });
export const reviseBudgetItemSchema = z.object({ id: budgetItemIdSchema, allocatedAmount: money, reason: z.string().trim().min(1).max(5000) });
export const approveBudgetPeriodSchema = z.object({ id: uuid, approvalNotes: z.string().trim().max(5000).optional() });
export const verifyBudgetPeriodSchema = z.object({ id: budgetPeriodIdSchema, notes: z.string().trim().max(5000).optional() });
export const createRealizationSchema = z.object({ budgetItemId: uuid, requestedAmount: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER), description: z.string().trim().min(1).max(10000), evidenceKey: z.string().trim().max(255).optional() });
export const realizationFiltersSchema = z.object({
  status: z.enum(["DRAFT", "SUBMITTED", "VERIFIED", "SAH", "REJECTED"]).optional(),
  budgetItemId: uuid.optional(),
  query: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export const transitionRealizationSchema = z.object({ id: uuid, status: z.enum(["SUBMITTED", "VERIFIED", "SAH", "REJECTED"]), notes: z.string().trim().max(5000).optional() });
export const correctRealizationSchema = z.object({ id: uuid, requestedAmount: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER), description: z.string().trim().min(1).max(10000), reason: z.string().trim().min(1).max(5000), evidenceKey: z.string().trim().max(255).optional() });
export const reverseRealizationSchema = z.object({ id: uuid, reason: z.string().trim().min(1).max(5000) });
