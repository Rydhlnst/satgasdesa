import { z } from "zod";

export const dateRangeFields = {
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD.").optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD.").optional(),
};

export function validateDateRange(value: { dateFrom?: string; dateTo?: string }, context: z.RefinementCtx): void {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) context.addIssue({ code: "custom", path: ["dateTo"], message: "End date must not be before start date." });
}

export function startOfJakartaDay(value: string): Date { return new Date(`${value}T00:00:00.000+07:00`); }
export function nextJakartaDay(value: string): Date { const date = startOfJakartaDay(value); date.setUTCDate(date.getUTCDate() + 1); return date; }
