"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  addTransactionEvidence,
  createTransactionEvidenceUploadUrl,
  getTransactionEvidenceDownloadUrl,
  getTransactionEvidence,
} from "@/src/features/evidence/service";
import { approveFinancialTransaction, createFinancialTransaction, reverseFinancialTransaction } from "@/src/features/finance/service";

function value(formData: FormData, key: string): string { const item = formData.get(key); return typeof item === "string" ? item.trim() : ""; }
function optional(valueToCheck: string): string | undefined { return valueToCheck || undefined; }

export async function createFinancialTransactionAction(formData: FormData) {
  const result = await createFinancialTransaction({
    idempotencyKey: value(formData, "idempotencyKey"),
    transactionAt: value(formData, "transactionAt") ? new Date(value(formData, "transactionAt")) : undefined,
    transactionType: value(formData, "transactionType"),
    amount: value(formData, "amount"),
    description: value(formData, "description"),
    relatedEntityType: optional(value(formData, "relatedEntityType")),
    relatedEntityId: optional(value(formData, "relatedEntityId")),
    evidenceKey: optional(value(formData, "evidenceKey")),
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/transactions");
  redirect(`/dashboard/finance/transactions/${result.id}`);
}

export async function approveFinancialTransactionAction(formData: FormData) {
  const id = value(formData, "id");
  await approveFinancialTransaction({ id });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/transactions");
  revalidatePath(`/dashboard/finance/transactions/${id}`);
  redirect(`/dashboard/finance/transactions/${id}`);
}

export async function reverseFinancialTransactionAction(formData: FormData) {
  const id = value(formData, "id");
  await reverseFinancialTransaction({ id, reason: value(formData, "reason") });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/finance");
  revalidatePath("/dashboard/finance/transactions");
  revalidatePath(`/dashboard/finance/transactions/${id}`);
  redirect(`/dashboard/finance/transactions/${id}`);
}

export async function createTransactionEvidenceUploadAction(input: { transactionId: string; originalName: string; contentType: string; sizeBytes: number }) {
  return createTransactionEvidenceUploadUrl(input);
}

export async function addTransactionEvidenceAction(input: { transactionId: string; storageKey: string; contentType: string; sizeBytes: number }) {
  const result = await addTransactionEvidence(input);
  revalidatePath(`/dashboard/finance/transactions/${input.transactionId}`);
  return result;
}

export async function getTransactionEvidenceAction(transactionId: string) { return getTransactionEvidence(transactionId); }
export async function getTransactionEvidenceDownloadAction(input: { transactionId: string; evidenceId: string }) { return getTransactionEvidenceDownloadUrl(input); }
