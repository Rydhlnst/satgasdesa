export function money(value: number | null | undefined) {
  return `Rp ${new Intl.NumberFormat("id-ID").format(Number(value ?? 0))}`;
}

export function count(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
}

export function dateLabel(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
