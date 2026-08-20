"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addDailyInformationFollowUp,
  createDailyInformation,
  getDailyInformationAttachmentDownloadUrl,
  transitionDailyInformation,
} from "@/src/features/daily-information/service";

function value(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function optional(valueToCheck: string): string | undefined {
  return valueToCheck || undefined;
}

export async function createDailyInformationAction(formData: FormData) {
  const reportedAt = value(formData, "reportedAt");
  const result = await createDailyInformation({
    blockId: optional(value(formData, "blockId")),
    reportedAt: reportedAt ? new Date(`${reportedAt}T00:00:00.000Z`) : undefined,
    category: value(formData, "category"),
    priority: value(formData, "priority"),
    description: value(formData, "description"),
    documentation: optional(value(formData, "documentation")),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/information");
  redirect(`/dashboard/information/${result.id}`);
}

export async function transitionDailyInformationAction(formData: FormData) {
  const result = await transitionDailyInformation({
    id: value(formData, "id"),
    status: value(formData, "status"),
    followUp: value(formData, "followUp"),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/information");
  revalidatePath(`/dashboard/information/${result.id}`);
  redirect(`/dashboard/information/${result.id}`);
}

export async function addDailyInformationFollowUpAction(formData: FormData) {
  const informationId = value(formData, "id");
  await addDailyInformationFollowUp({ id: informationId, note: value(formData, "note") });
  revalidatePath(`/dashboard/information/${informationId}`);
  redirect(`/dashboard/information/${informationId}`);
}

export async function getDailyInformationAttachmentDownloadAction(input: { id: string; storageKey: string }) {
  return getDailyInformationAttachmentDownloadUrl(input);
}
