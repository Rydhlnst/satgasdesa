export function isValidCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function isMonthlyPaymentDate(value: string, periodKey?: string): boolean {
  if (!isValidCalendarDate(value)) return false;
  if (periodKey && !value.startsWith(`${periodKey}-`)) return false;
  const day = Number(value.slice(-2));
  return day >= 1 && day <= 10;
}
