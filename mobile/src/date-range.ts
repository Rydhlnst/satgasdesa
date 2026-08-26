export type DateRange = { dateFrom: string; dateTo: string };

import { isValidCalendarDate } from "./date-validation";

function pad(value: number): string { return String(value).padStart(2, "0"); }

export function formatDate(date: Date): string { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; }

export function currentDateRange(now = new Date()): DateRange {
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { dateFrom: formatDate(start), dateTo: formatDate(end) };
}

export function isValidDate(value: string): boolean {
  return isValidCalendarDate(value);
}

let activeDateRange = currentDateRange();

export function getActiveDateRange(): DateRange { return activeDateRange; }
export function setActiveDateRange(range: DateRange): void { activeDateRange = range; }
