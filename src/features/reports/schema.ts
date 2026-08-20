import { z } from "zod";

export const monthlyReportPeriodSchema = z.object({
  periodKey: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Period must use YYYY-MM."),
});

export const monthlyReportFormatSchema = z.enum(["pdf", "xlsx"]);
