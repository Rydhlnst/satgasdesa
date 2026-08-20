import { z } from "zod";

const uuid = z.string().uuid("Invalid ID.");
export const MAX_INSPECTION_PHOTOS = 3;
export const MAX_INSPECTION_PHOTO_BYTES = 10 * 1024 * 1024;

export const inspectionIdSchema = uuid;
export const inspectionUploadSchema = z.object({
  inspectionId: inspectionIdSchema,
  contentType: z.string().trim().min(1).max(100),
  size: z.coerce.number().int().positive().max(MAX_INSPECTION_PHOTO_BYTES),
  originalName: z.string().trim().min(1).max(255),
});

export const inspectionPhotoInputSchema = z.object({
  storageKey: z.string().trim().min(1).max(255),
  contentType: z.string().trim().min(1).max(100),
  size: z.coerce.number().int().positive(),
  originalName: z.string().trim().min(1).max(255),
  capturedAt: z.coerce.date().optional(),
});

export const createInspectionSchema = z.object({
  id: inspectionIdSchema.optional(),
  blockId: uuid,
  inspectedAt: z.coerce.date().optional(),
  latitude: z.coerce.number().finite().min(-90).max(90),
  longitude: z.coerce.number().finite().min(-180).max(180),
  gpsAccuracy: z.coerce.number().finite().min(0).max(100000),
  gpsCapturedAt: z.coerce.date().optional(),
  excavatorCount: z.coerce.number().int().min(0).max(100000),
  workerCount: z.coerce.number().int().min(0).max(1000000),
  condition: z.string().trim().min(1, "Condition is required.").max(5000),
  findings: z.string().trim().max(10000).optional(),
  notes: z.string().trim().max(10000).optional(),
  photos: z.array(inspectionPhotoInputSchema).max(MAX_INSPECTION_PHOTOS, `A maximum of ${MAX_INSPECTION_PHOTOS} inspection photos is allowed.`).default([]),
});

export const inspectionPhotoDownloadSchema = z.object({
  inspectionId: inspectionIdSchema,
  storageKey: z.string().trim().min(1).max(255),
});
