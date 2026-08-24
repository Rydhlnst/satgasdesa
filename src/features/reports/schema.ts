import { z } from "zod";

export const monthlyReportPeriodSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Period must use YYYY-MM."),
});

const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD.");
export const reportFiltersSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional(),
  dateFrom: calendarDate.optional(),
  dateTo: calendarDate.optional(),
  blockId: z.string().uuid().optional(),
  category: z.string().trim().max(64).optional(),
  status: z.string().trim().max(32).optional(),
}).refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo, { message: "dateFrom must not be after dateTo.", path: ["dateTo"] });

export const monthlyReportFormatSchema = z.enum(["pdf", "xlsx"]);
