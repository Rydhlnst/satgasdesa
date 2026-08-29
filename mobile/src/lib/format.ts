const rupiahFormatter = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function money(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return `Rp. ${rupiahFormatter.format(Number.isFinite(amount) ? amount : 0)}`;
}

export function formatMoneyInput(value: string | number | null | undefined) {
  const raw = String(value ?? "").replace(/\D/g, "");
  return raw ? money(Number(raw)) : "";
}

export function parseMoneyInput(value: string) {
  const integerPart = value.replace(/^\s*Rp\.?\s*/i, "").split(",", 1)[0];
  return integerPart.replace(/\D/g, "");
}

export function count(value: number | null | undefined) {
  return new Intl.NumberFormat("id-ID").format(Number(value ?? 0));
}

export function dateLabel(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
}
