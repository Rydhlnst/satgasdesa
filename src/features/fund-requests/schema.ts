import { z } from "zod";

import { FUND_REQUEST_STATUSES } from "./constants";

const uuid = z.string().uuid("Invalid ID.");
const money = z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");

const requestFields = z.object({
  budgetPeriodId: uuid,
  budgetCategoryId: uuid,
  budgetSubcategoryId: uuid.optional(),
  blockId: uuid.optional(),
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().min(1).max(10_000),
  amount: money,
  requestedAt: date,
});

export const fundRequestFiltersSchema = z.object({
  status: z.enum(FUND_REQUEST_STATUSES).optional(),
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  categoryId: uuid.optional(),
  blockId: uuid.optional(),
  mine: z.coerce.boolean().default(false),
  query: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const createFundRequestSchema = requestFields;
export const updateFundRequestSchema = requestFields.extend({ id: uuid });
export const transitionFundRequestSchema = z.object({ id: uuid, status: z.enum(["SUBMITTED", "VERIFIED", "APPROVED", "REVISION_REQUIRED", "REJECTED", "CANCELLED"]), notes: z.string().trim().max(5_000).optional() });
export const correctFundRequestSchema = requestFields.extend({ id: uuid, reason: z.string().trim().min(1).max(5_000) });
export const fundRequestAttachmentUploadSchema = z.object({ fundRequestId: uuid, contentType: z.string().trim().min(1).max(100), size: z.coerce.number().int().positive().max(10 * 1024 * 1024), originalName: z.string().trim().min(1).max(255) });
export const addFundRequestAttachmentSchema = z.object({ fundRequestId: uuid, storageKey: z.string().trim().min(1).max(255), contentType: z.string().trim().min(1).max(100), sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024), caption: z.string().trim().max(255).optional() });
export const fundRequestAttachmentDownloadSchema = z.object({ id: uuid });
