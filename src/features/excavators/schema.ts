import { z } from "zod";

import { EXCAVATOR_MOVEMENT_TYPES } from "./constants";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid date.");

export const excavatorIdSchema = z.string().uuid("Invalid excavator ID.");
export const blockIdSchema = z.string().uuid("Invalid block ID.");

export const registerExcavatorSchema = z
  .object({
    unitCode: z.string().trim().min(1, "Unit code is required.").max(64).transform((value) => value.toUpperCase()),
    brand: z.string().trim().min(1, "Brand is required.").max(100),
    model: z.string().trim().min(1, "Model is required.").max(100),
    businessActorId: z.string().uuid("Business actor is required."),
    operatorName: z.string().trim().max(160).optional(),
    currentBlockId: blockIdSchema.optional(),
    entryDate: calendarDate.optional(),
    notes: z.string().trim().max(5000).optional(),
  })
  .superRefine((value, context) => {
    if (value.currentBlockId && !value.entryDate) {
      context.addIssue({ code: "custom", path: ["entryDate"], message: "Entry date is required for an active excavator." });
    }
    if (!value.currentBlockId && value.entryDate) {
      context.addIssue({ code: "custom", path: ["currentBlockId"], message: "A current block is required when an entry date is set." });
    }
  });

export const updateExcavatorSchema = z.object({
  id: excavatorIdSchema,
  unitCode: z.string().trim().min(1, "Unit code is required.").max(64).transform((value) => value.toUpperCase()),
  brand: z.string().trim().min(1, "Brand is required.").max(100),
  model: z.string().trim().min(1, "Model is required.").max(100),
  operatorName: z.string().trim().max(160).optional(),
});

export const excavatorPhotoUploadSchema = z.object({
  excavatorId: excavatorIdSchema,
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024),
  originalName: z.string().trim().min(1).max(255),
});

export const setExcavatorPhotoSchema = z.object({
  excavatorId: excavatorIdSchema,
  storageKey: z.string().trim().min(1).max(255),
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.coerce.number().int().positive().max(10 * 1024 * 1024),
});

export const excavatorPhotoDownloadSchema = z.object({
  excavatorId: excavatorIdSchema,
  storageKey: z.string().trim().min(1).max(255),
});

export const recordExcavatorMovementSchema = z.object({
  excavatorId: excavatorIdSchema,
  movementType: z.enum(EXCAVATOR_MOVEMENT_TYPES),
  toBlockId: blockIdSchema.optional(),
  occurredAt: z.coerce.date().optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const excavatorFiltersSchema = z.object({
  query: z.string().trim().max(100).optional(),
  operatorName: z.string().trim().max(160).optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "EXITED"]).optional(),
  blockId: blockIdSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
