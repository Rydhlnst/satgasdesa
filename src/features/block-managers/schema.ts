import { z } from "zod";

import { BLOCK_ASSIGNMENT_ROLES } from "./constants";
import { calendarDate } from "@/src/lib/date-range";

export const blockIdSchema = z.string().uuid("Invalid block ID.");
export const blockManagerIdSchema = z.string().uuid("Invalid block manager ID.");

export const assignBlockManagerSchema = z.object({
  blockId: blockIdSchema,
  assignmentRole: z.enum(BLOCK_ASSIGNMENT_ROLES),
  personName: z.string().trim().min(1, "Name is required.").max(160),
  contact: z.string().trim().max(64).optional(),
  startedAt: calendarDate(),
  notes: z.string().trim().max(5000).optional(),
});

export const closeBlockManagerSchema = z.object({
  id: blockManagerIdSchema,
  endedAt: calendarDate(),
});
