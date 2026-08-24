export function text(row: Record<string, unknown> | undefined, key: string, fallback = "-") { const value = row?.[key]; return value === null || value === undefined || value === "" ? fallback : String(value); }
export function numberValue(row: Record<string, unknown> | undefined, key: string) { const value = Number(row?.[key] ?? 0); return Number.isFinite(value) ? value : 0; }
