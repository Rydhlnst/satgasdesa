import { eq } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/src/db";
import { auditLog } from "@/src/db/schema/audit";
import { appSetting } from "@/src/db/schema/settings";
import { AUDIT_ACTIONS, createAuditLogValues } from "@/src/lib/audit";
import { requirePermission } from "@/src/lib/permissions/authorize";
import { PERMISSIONS } from "@/src/lib/permissions/constants";

const monthKey = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
const settingsSchema = z.object({
  organization: z.object({ name: z.string().trim().min(2).max(160), address: z.string().trim().max(500).default(""), phone: z.string().trim().max(30).default(""), logoUrl: z.string().trim().url().or(z.literal("")).default("") }),
  financeDefaults: z.object({ monthlyDueAmount: z.coerce.number().int().positive().max(999_999_999), roadEntryDueAmount: z.coerce.number().int().positive().max(999_999_999), monthlyDueDay: z.coerce.number().int().min(1).max(10), roadEntryAutomationEnabled: z.boolean() }),
  activePeriod: z.object({ periodKey: monthKey }),
  uploadLimits: z.object({ maxFileSizeMb: z.coerce.number().int().min(1).max(25) }),
  reportSettings: z.object({ footer: z.string().trim().max(300).default(""), includeAuditReference: z.boolean().default(true) }),
});
export type SystemSettings = z.infer<typeof settingsSchema>;
export const updateSystemSettingsSchema = settingsSchema;
const todayPeriod = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit" }).format(new Date());
const fallback: SystemSettings = { organization: { name: "Satgas Desa Sejoli", address: "", phone: "", logoUrl: "" }, financeDefaults: { monthlyDueAmount: 10_000_000, roadEntryDueAmount: 5_000_000, monthlyDueDay: 10, roadEntryAutomationEnabled: process.env.ROAD_ENTRY_DUE_AUTOMATION_ENABLED === "true" }, activePeriod: { periodKey: todayPeriod }, uploadLimits: { maxFileSizeMb: 10 }, reportSettings: { footer: "", includeAuditReference: true } };
function parseValue<T>(schema: z.ZodType<T>, value: unknown, fallbackValue: T): T { const parsed = schema.safeParse(value); return parsed.success ? parsed.data : fallbackValue; }

export async function getSystemSettings(): Promise<SystemSettings> {
  await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const rows = await getDb().select().from(appSetting);
  const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { organization: parseValue(settingsSchema.shape.organization, values.organization, fallback.organization), financeDefaults: parseValue(settingsSchema.shape.financeDefaults, values.financeDefaults, fallback.financeDefaults), activePeriod: parseValue(settingsSchema.shape.activePeriod, values.activePeriod, fallback.activePeriod), uploadLimits: parseValue(settingsSchema.shape.uploadLimits, values.uploadLimits, fallback.uploadLimits), reportSettings: parseValue(settingsSchema.shape.reportSettings, values.reportSettings, fallback.reportSettings) };
}

export async function getFinanceDefaults() {
  const [row] = await getDb().select().from(appSetting).where(eq(appSetting.key, "financeDefaults")).limit(1);
  return parseValue(settingsSchema.shape.financeDefaults, row?.value, fallback.financeDefaults);
}

export async function updateSystemSettings(input: unknown): Promise<SystemSettings> {
  const session = await requirePermission(PERMISSIONS.SETTINGS_MANAGE);
  const values = settingsSchema.parse(input); const previous = await getSystemSettings(); const now = new Date();
  await getDb().transaction(async (tx) => {
    for (const key of Object.keys(values) as Array<keyof SystemSettings>) {
      await tx.insert(appSetting).values({ key, value: values[key], updatedBy: session.user.id, createdAt: now, updatedAt: now }).onDuplicateKeyUpdate({ set: { value: values[key], updatedBy: session.user.id, updatedAt: now } });
      await tx.insert(auditLog).values(createAuditLogValues({ actorUserId: session.user.id, action: AUDIT_ACTIONS.UPDATE, entityType: "SYSTEM_SETTING", entityId: key, oldValues: previous[key], newValues: values[key] }));
    }
  });
  return values;
}
