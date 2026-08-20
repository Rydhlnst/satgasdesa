import { z } from "zod";

import { PAYMENT_METHODS } from "./config";

const uuid = z.string().uuid("Invalid ID.");
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD.")
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00.000Z`)), "Invalid date.");

export const dueIdSchema = uuid;
export const createDueSchema = z.object({
  excavatorId: uuid,
  sourceMovementId: uuid.optional(),
  dueType: z.enum(["MONTHLY", "ROAD_ENTRY"]),
  referenceKey: z.string().trim().min(1).max(64),
  payerName: z.string().trim().min(1, "Payer is required.").max(160),
  amountDue: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  dueDate: calendarDate,
}).superRefine((value, context) => {
  if (value.dueType === "MONTHLY") {
    if (value.sourceMovementId) context.addIssue({ code: "custom", path: ["sourceMovementId"], message: "Monthly dues cannot be linked to a road-entry movement." });
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value.referenceKey)) context.addIssue({ code: "custom", path: ["referenceKey"], message: "Monthly dues require a YYYY-MM reference." });
    if (value.amountDue !== 10_000_000) context.addIssue({ code: "custom", path: ["amountDue"], message: "Monthly dues must be Rp10.000.000." });
  }
  if (value.dueType === "ROAD_ENTRY") {
    if (!value.sourceMovementId) context.addIssue({ code: "custom", path: ["sourceMovementId"], message: "Road-entry dues require a source movement." });
    if (!value.referenceKey.startsWith("ENTRY-")) context.addIssue({ code: "custom", path: ["referenceKey"], message: "Road-entry dues require an ENTRY reference." });
    if (value.amountDue !== 5_000_000) context.addIssue({ code: "custom", path: ["amountDue"], message: "Road-entry dues must be Rp5.000.000." });
  }
});

export const recordDuePaymentSchema = z.object({
  dueId: dueIdSchema,
  idempotencyKey: uuid,
  payerName: z.string().trim().min(1, "Payer is required.").max(160),
  paymentDate: calendarDate,
  amount: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  method: z.enum(PAYMENT_METHODS),
  evidenceKey: z.string().trim().max(255).optional(),
  notes: z.string().trim().max(5000).optional(),
});

export const duesFiltersSchema = z.object({
  status: z.enum(["UNPAID", "PARTIAL", "PAID"]).optional(),
  dueType: z.enum(["MONTHLY", "ROAD_ENTRY"]).optional(),
  blockId: uuid.optional(),
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});
