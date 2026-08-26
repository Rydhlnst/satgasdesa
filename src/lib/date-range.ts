import { z } from "zod";

export const dateRangeFields = {
  dateFrom: calendarDate("Date must use YYYY-MM-DD.", "Invalid date.").optional(),
  dateTo: calendarDate("Date must use YYYY-MM-DD.", "Invalid date.").optional(),
};

export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function calendarDate(formatMessage = "Date must use YYYY-MM-DD.", invalidMessage = "Invalid date.") {
  return z.string().regex(/^\d{4}-\d{2}-\d{2}$/, formatMessage).refine(isValidCalendarDate, invalidMessage);
}

export function validateDateRange(value: { dateFrom?: string; dateTo?: string }, context: z.RefinementCtx): void {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) context.addIssue({ code: "custom", path: ["dateTo"], message: "End date must not be before start date." });
}

export function startOfJakartaDay(value: string): Date { return new Date(`${value}T00:00:00.000+07:00`); }
export function nextJakartaDay(value: string): Date { const date = startOfJakartaDay(value); date.setUTCDate(date.getUTCDate() + 1); return date; }
