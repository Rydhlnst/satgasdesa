import { z } from "zod";

export const BLOCK_STATUSES = ["ACTIVE", "STOPPED", "NOT_OPERATING"] as const;
export const BLOCK_PRIORITIES = ["LOW", "NORMAL", "HIGH", "CRITICAL"] as const;
export const blockIdSchema = z.string().uuid("Invalid block ID.");

export const blockFormSchema = z.object({
  code: z.string().trim().min(1, "Block code is required.").max(32),
  name: z.string().trim().min(1, "Block name is required.").max(160),
  status: z.enum(BLOCK_STATUSES),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  locationPhotoKey: z.string().trim().max(255).optional(),
  managerName: z.string().trim().max(160).optional(),
  locationPicName: z.string().trim().max(160).optional(),
  fieldPicName: z.string().trim().max(160).optional(),
  contact: z.string().trim().max(64).optional(),
  areaHectares: z.coerce.number().finite().min(0).max(1000000).optional(),
  priority: z.enum(BLOCK_PRIORITIES).default("NORMAL"),
  workerCount: z.coerce.number().int().min(0).max(100000),
  operationalCondition: z.string().trim().min(1, "Operational condition is required.").max(5000),
  startDate: z.string().trim().max(10).optional(),
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
