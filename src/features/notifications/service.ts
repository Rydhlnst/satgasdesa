import "server-only";

import { and, count, desc, eq, gte, inArray, isNull, like, lt, or } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/src/db";
import { notification, notificationDispatch, pushDevice } from "@/src/db/schema/notifications";
import { user } from "@/src/db/schema/auth";
import { permission, rolePermission, userRole } from "@/src/db/schema/rbac";
import { requireAuth } from "@/src/lib/permissions/authorize";
import { type Permission } from "@/src/lib/permissions/constants";
import { dateRangeFields, nextJakartaDay, startOfJakartaDay, validateDateRange } from "@/src/lib/date-range";

const createSchema = z.object({ recipientUserId: z.string().uuid(), type: z.string().trim().min(1).max(64), title: z.string().trim().min(1).max(255), body: z.string().trim().min(1).max(5000), relatedEntityType: z.string().trim().max(64).optional(), relatedEntityId: z.string().uuid().optional() });
const notificationFiltersSchema = z.object({ unreadOnly: z.boolean().default(false), query: z.string().trim().max(100).optional(), ...dateRangeFields, page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) }).superRefine(validateDateRange);
const pushDeviceSchema = z.object({ expoPushToken: z.string().regex(/^(?:Expo|Exponent)PushToken\[[^\]]+\]$/, "Invalid Expo push token.").max(255), platform: z.enum(["android", "ios"]) });

export async function getMyNotifications(input?: boolean | unknown) {
  const session = await requireAuth();
  const values = notificationFiltersSchema.parse(typeof input === "boolean" ? { unreadOnly: input } : input ?? {});
  const conditions = [
    eq(notification.recipientUserId, session.user.id),
    values.unreadOnly ? isNull(notification.readAt) : undefined,
    values.query ? or(like(notification.title, `%${values.query}%`), like(notification.body, `%${values.query}%`)) : undefined,
    values.dateFrom ? gte(notification.createdAt, startOfJakartaDay(values.dateFrom)) : undefined,
    values.dateTo ? lt(notification.createdAt, nextJakartaDay(values.dateTo)) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  const where = and(...conditions);
  const database = getDb();
  const [items, [{ total }]] = await Promise.all([
    database.select().from(notification).where(where).orderBy(desc(notification.createdAt)).limit(values.pageSize).offset((values.page - 1) * values.pageSize),
    database.select({ total: count() }).from(notification).where(where),
  ]);
  return { items, page: values.page, pageSize: values.pageSize, total: Number(total), totalPages: Math.ceil(Number(total) / values.pageSize) };
}

export async function getUnreadNotificationCount() {
  const session = await requireAuth();
  const [result] = await getDb().select({ total: count() }).from(notification).where(and(eq(notification.recipientUserId, session.user.id), isNull(notification.readAt)));
  return Number(result?.total ?? 0);
}

const notificationOnceSchema = createSchema.extend({ ruleKey: z.string().trim().min(1).max(64), targetKey: z.string().trim().min(1).max(128) });

async function insertNotificationOnce(input: unknown) {
  const values = notificationOnceSchema.parse(input); const now = new Date(); const id = crypto.randomUUID();
  try {
    await getDb().transaction(async (tx) => {
      await tx.insert(notification).values({ id, recipientUserId: values.recipientUserId, type: values.type, title: values.title, body: values.body, relatedEntityType: values.relatedEntityType ?? null, relatedEntityId: values.relatedEntityId ?? null, readAt: null, createdAt: now });
      await tx.insert(notificationDispatch).values({ id: crypto.randomUUID(), ruleKey: values.ruleKey, targetKey: values.targetKey, recipientUserId: values.recipientUserId, notificationId: id, createdAt: now });
    });
    await dispatchPushNotification(values);
    return { id, created: true };
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY") return { id: null, created: false };
    throw error;
  }
}

async function dispatchPushNotification(input: z.infer<typeof createSchema>): Promise<void> {
  if (process.env.PUSH_NOTIFICATIONS_ENABLED !== "true") return;

  try {
    const devices = await getDb()
      .select({ expoPushToken: pushDevice.expoPushToken })
      .from(pushDevice)
      .where(eq(pushDevice.userId, input.recipientUserId));
    if (!devices.length) return;

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(devices.map((device) => ({
        to: device.expoPushToken,
        sound: "default",
        title: input.title,
        body: input.body,
        data: { relatedEntityType: input.relatedEntityType, relatedEntityId: input.relatedEntityId },
      }))),
    });
    if (!response.ok) throw new Error(`Expo Push API returned ${response.status}.`);

    const result = await response.json() as { data?: Array<{ status?: string; details?: { error?: string } }> };
    const invalidTokens = devices
      .filter((_, index) => result.data?.[index]?.status === "error" && result.data[index]?.details?.error === "DeviceNotRegistered")
      .map((device) => device.expoPushToken);
    if (invalidTokens.length) await getDb().delete(pushDevice).where(inArray(pushDevice.expoPushToken, invalidTokens));
  } catch (error) {
    console.error("Push notification delivery failed.", error);
  }
}

/** For trusted server-side domain workflows only. Do not expose through an action or route. */
export async function createSystemNotificationOnce(input: unknown) {
  return insertNotificationOnce(input);
}

/** For trusted server-side domain workflows only. Do not expose through an action or route. */
export async function notifyPermissionHolders(input: { permission: Permission; ruleKey: string; targetKey: string; type: string; title: string; body: string; relatedEntityType?: string; relatedEntityId?: string }) {
  const recipients = await getDb().select({ userId: userRole.userId }).from(userRole).innerJoin(user, eq(user.id, userRole.userId)).innerJoin(rolePermission, eq(rolePermission.roleId, userRole.roleId)).innerJoin(permission, eq(permission.id, rolePermission.permissionId)).where(and(eq(permission.name, input.permission), eq(user.status, "ACTIVE")));
  const uniqueRecipients = [...new Set(recipients.map((item) => item.userId))];
  const results = await Promise.all(uniqueRecipients.map((recipientUserId) => insertNotificationOnce({ ...input, recipientUserId })));
  return { recipients: uniqueRecipients.length, created: results.filter((result) => result.created).length };
}

export async function registerPushDevice(input: unknown) {
  const session = await requireAuth();
  const values = pushDeviceSchema.parse(input);
  const now = new Date();
  await getDb().insert(pushDevice).values({
    id: crypto.randomUUID(),
    userId: session.user.id,
    expoPushToken: values.expoPushToken,
    platform: values.platform,
    lastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  }).onDuplicateKeyUpdate({
    set: { userId: session.user.id, platform: values.platform, lastSeenAt: now, updatedAt: now },
  });
  return { registered: true };
}

export async function markNotificationRead(id: string) {
  const session = await requireAuth();
  const [result] = await getDb().update(notification).set({ readAt: new Date() }).where(and(eq(notification.id, z.string().uuid().parse(id)), eq(notification.recipientUserId, session.user.id)));
  return { updated: result.affectedRows === 1 };
}

export async function markAllNotificationsRead() {
  const session = await requireAuth();
  const [result] = await getDb().update(notification).set({ readAt: new Date() }).where(and(eq(notification.recipientUserId, session.user.id), isNull(notification.readAt)));
  return { updated: result.affectedRows };
}
