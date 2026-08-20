import { z } from "zod";

import { BLOCK_ASSIGNMENT_ROLES } from "./constants";

const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid date.");

export const blockIdSchema = z.string().uuid("Invalid block ID.");
export const blockManagerIdSchema = z.string().uuid("Invalid block manager ID.");

export const assignBlockManagerSchema = z.object({
  blockId: blockIdSchema,
  assignmentRole: z.enum(BLOCK_ASSIGNMENT_ROLES),
  personName: z.string().trim().min(1, "Name is required.").max(160),
  contact: z.string().trim().max(64).optional(),
  startedAt: calendarDate,
  notes: z.string().trim().max(5000).optional(),
});

export const closeBlockManagerSchema = z.object({
  id: blockManagerIdSchema,
  endedAt: calendarDate,
});
