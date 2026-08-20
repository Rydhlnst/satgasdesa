"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { addRealizationEvidence, createRealizationEvidenceUploadUrl, getRealizationEvidence, getRealizationEvidenceDownloadUrl } from "@/src/features/evidence/service";
import { correctRealization, createRealization, reverseRealization, transitionRealization } from "@/src/features/budgets/service";

function value(formData: FormData, key: string): string { const item = formData.get(key); return typeof item === "string" ? item.trim() : ""; }
function optional(valueToCheck: string): string | undefined { return valueToCheck || undefined; }

export async function createRealizationAction(formData: FormData) {
  const result = await createRealization({ budgetItemId: value(formData, "budgetItemId"), requestedAmount: value(formData, "requestedAmount"), description: value(formData, "description"), evidenceKey: optional(value(formData, "evidenceKey")) });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/realizations");
  redirect(`/dashboard/realizations/${result.id}`);
}

export async function transitionRealizationAction(formData: FormData) {
  const id = value(formData, "id");
  await transitionRealization({ id, status: value(formData, "status"), notes: optional(value(formData, "notes")) });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/realizations");
  revalidatePath(`/dashboard/realizations/${id}`);
  redirect(`/dashboard/realizations/${id}`);
}

export async function correctRealizationAction(formData: FormData) {
  const result = await correctRealization({ id: value(formData, "id"), requestedAmount: value(formData, "requestedAmount"), description: value(formData, "description"), reason: value(formData, "reason"), evidenceKey: optional(value(formData, "evidenceKey")) });
  revalidatePath("/dashboard/realizations");
  redirect(`/dashboard/realizations/${result.id}`);
}

export async function reverseRealizationAction(formData: FormData) {
  const id = value(formData, "id");
  await reverseRealization({ id, reason: value(formData, "reason") });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/realizations");
  revalidatePath(`/dashboard/realizations/${id}`);
  redirect(`/dashboard/realizations/${id}`);
}

export async function createRealizationEvidenceUploadAction(input: { realizationId: string; originalName: string; contentType: string; sizeBytes: number }) { return createRealizationEvidenceUploadUrl(input); }
export async function addRealizationEvidenceAction(input: { realizationId: string; storageKey: string; contentType: string; sizeBytes: number }) { const result = await addRealizationEvidence(input); revalidatePath(`/dashboard/realizations/${input.realizationId}`); return result; }
export async function getRealizationEvidenceAction(realizationId: string) { return getRealizationEvidence(realizationId); }
export async function getRealizationEvidenceDownloadAction(input: { realizationId: string; evidenceId: string }) { return getRealizationEvidenceDownloadUrl(input); }
