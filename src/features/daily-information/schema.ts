import { z } from "zod";

import { DAILY_INFORMATION_CATEGORIES, DAILY_INFORMATION_PRIORITIES, DAILY_INFORMATION_STATUSES } from "./constants";

const uuid = z.string().uuid("Invalid ID.");

export const dailyInformationIdSchema = uuid;
export const dailyInformationFiltersSchema = z.object({
  query: z.string().trim().max(100).optional(),
  blockId: uuid.optional(),
  category: z.enum(DAILY_INFORMATION_CATEGORIES).optional(),
  priority: z.enum(DAILY_INFORMATION_PRIORITIES).optional(),
  status: z.enum(DAILY_INFORMATION_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
export const createDailyInformationSchema = z.object({
  blockId: uuid.optional(),
  reportedAt: z.coerce.date().optional(),
  category: z.enum(DAILY_INFORMATION_CATEGORIES),
  priority: z.enum(DAILY_INFORMATION_PRIORITIES),
  description: z.string().trim().min(1, "Description is required.").max(10000),
  documentation: z.string().trim().max(10000).optional(),
});

export const transitionDailyInformationSchema = z.object({
  id: dailyInformationIdSchema,
  status: z.enum(DAILY_INFORMATION_STATUSES),
  followUp: z.string().trim().min(1, "Follow-up is required.").max(10000),
});

export const addDailyInformationFollowUpSchema = z.object({ id: dailyInformationIdSchema, note: z.string().trim().min(1).max(5000) });
export const addDailyInformationAttachmentSchema = z.object({ id: dailyInformationIdSchema, storageKey: z.string().trim().min(1).max(255), contentType: z.string().trim().min(1).max(100), sizeBytes: z.coerce.number().int().positive().max(25 * 1024 * 1024) });
export const dailyInformationAttachmentDownloadSchema = z.object({ id: dailyInformationIdSchema, storageKey: z.string().trim().min(1).max(255) });
