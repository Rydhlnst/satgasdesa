"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { generateMonthlyDues } from "@/src/features/dues/automation";
import { createDue, recordDuePayment } from "@/src/features/dues/service";
import { getActionErrorMessage } from "@/components/shared/action-form";

function value(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function optional(valueToCheck: string): string | undefined { return valueToCheck || undefined; }

export async function createDueAction(formData: FormData) {
  let result: Awaited<ReturnType<typeof createDue>>;
  try {
    result = await createDue({
      excavatorId: value(formData, "excavatorId"),
      sourceMovementId: optional(value(formData, "sourceMovementId")),
      dueType: value(formData, "dueType"),
      referenceKey: value(formData, "referenceKey"),
      payerName: value(formData, "payerName"),
      amountDue: value(formData, "amountDue"),
      dueDate: value(formData, "dueDate"),
    });
  } catch (error) {
    redirect(`/dashboard/dues?actionError=${encodeURIComponent(getActionErrorMessage(error))}`);
  }
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dues");
  redirect(`/dashboard/dues/${result.id}`);
}

export async function recordDuePaymentAction(formData: FormData) {
  const dueId = value(formData, "dueId");
  await recordDuePayment({
    dueId,
    idempotencyKey: value(formData, "idempotencyKey"),
    payerName: value(formData, "payerName"),
    paymentDate: value(formData, "paymentDate"),
    amount: value(formData, "amount"),
    method: value(formData, "method"),
    evidenceKey: optional(value(formData, "evidenceKey")),
    notes: optional(value(formData, "notes")),
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dues");
  revalidatePath(`/dashboard/dues/${dueId}`);
  redirect(`/dashboard/dues/${dueId}`);
}

export async function generateMonthlyDuesAction(formData: FormData) {
  await generateMonthlyDues({ periodKey: value(formData, "periodKey") });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/dues");
  redirect("/dashboard/dues");
}
