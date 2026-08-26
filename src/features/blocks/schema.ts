import { z } from "zod";

import { calendarDate } from "@/src/lib/date-range";

export const BLOCK_STATUSES = ["ACTIVE", "STOPPED", "NOT_OPERATING"] as const;
export const BLOCK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
export const blockIdSchema = z.string().uuid("Invalid block ID.");

const blankToUndefined = (value: unknown) => (value === "" || value === null ? undefined : value);
const blankToZero = (value: unknown) => (value === "" || value === null || value === undefined ? 0 : value);
const optionalNumber = <T extends z.ZodType>(schema: T) => z.preprocess(blankToUndefined, schema.optional());
const optionalDate = z.preprocess(blankToUndefined, calendarDate("Start date must use YYYY-MM-DD.", "Invalid start date.").optional());

export const blockFormSchema = z.object({
  code: z.string().trim().min(1, "Block code is required.").max(32, "Block code must be 32 characters or fewer."),
  name: z.string().trim().min(1, "Block name is required.").max(160, "Block name must be 160 characters or fewer."),
  status: z.enum(BLOCK_STATUSES, { error: "Choose a valid block status." }),
  latitude: z.preprocess(blankToUndefined, z.coerce.number().finite().min(-90, "Latitude must be between -90 and 90.").max(90, "Latitude must be between -90 and 90.")),
  longitude: z.preprocess(blankToUndefined, z.coerce.number().finite().min(-180, "Longitude must be between -180 and 180.").max(180, "Longitude must be between -180 and 180.")),
  locationPhotoKey: z.string().trim().max(255).optional(),
  managerName: z.string().trim().max(160).optional(),
  locationPicName: z.string().trim().max(160).optional(),
  fieldPicName: z.string().trim().max(160).optional(),
  contact: z.string().trim().max(64).optional(),
  areaHectares: optionalNumber(z.coerce.number().finite().min(0, "Area cannot be negative.").max(1000000, "Area is too large.")),
  priority: z.enum(BLOCK_PRIORITIES, { error: "Choose a valid priority." }).default("NORMAL"),
  workerCount: z.preprocess(blankToZero, z.coerce.number().int("Worker count must be a whole number.").min(0, "Worker count cannot be negative.").max(100000, "Worker count is too large.")),
  operationalCondition: z.string().trim().min(1, "Operational condition is required.").max(5000, "Operational condition must be 5,000 characters or fewer."),
  startDate: optionalDate,
  notes: z.string().trim().max(5000).optional(),
});

export const blockArchiveSchema = z.object({
  id: blockIdSchema,
  archived: z.boolean(),
  reason: z.string().trim().max(5000).optional(),
});

export const blockPhotoUploadSchema = z.object({
  blockId: blockIdSchema,
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024),
  originalName: z.string().trim().min(1).max(255),
});

export const addBlockPhotoSchema = z.object({
  blockId: blockIdSchema,
  storageKey: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024),
  caption: z.string().trim().max(255).optional(),
});

export const blockPhotoDownloadSchema = z.object({ blockId: blockIdSchema, storageKey: z.string().trim().min(1).max(255) });

export type BlockFormValues = z.infer<typeof blockFormSchema>;
