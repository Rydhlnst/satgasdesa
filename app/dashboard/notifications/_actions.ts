"use server";

import { revalidatePath } from "next/cache";
import { markAllNotificationsRead, markNotificationRead } from "@/src/features/notifications/service";

export async function markNotificationReadAction(formData: FormData) { await markNotificationRead(String(formData.get("id") ?? "")); revalidatePath("/dashboard/notifications"); revalidatePath("/dashboard"); }
export async function markAllNotificationsReadAction() { await markAllNotificationsRead(); revalidatePath("/dashboard/notifications"); revalidatePath("/dashboard"); }
