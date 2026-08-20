"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { approveBudgetPeriod, createBudgetItem, createBudgetPeriod, reviseBudgetItem, updateBudgetItem, verifyBudgetPeriod } from "@/src/features/budgets/service";

function value(formData: FormData, key: string): string { const item = formData.get(key); return typeof item === "string" ? item.trim() : ""; }
function optional(valueToCheck: string): string | undefined { return valueToCheck || undefined; }
function periodPath(id: string): string { return `/dashboard/budgets/${id}`; }

export async function createBudgetPeriodAction(formData: FormData) {
  const result = await createBudgetPeriod({ periodKey: value(formData, "periodKey"), openingBalance: value(formData, "openingBalance"), estimatedIncome: value(formData, "estimatedIncome") });
  revalidatePath("/dashboard/budgets");
  redirect(periodPath(result.id));
}

export async function createBudgetItemAction(formData: FormData) {
  const periodId = value(formData, "periodId");
  await createBudgetItem({ groupId: value(formData, "groupId"), name: value(formData, "name"), allocatedAmount: value(formData, "allocatedAmount"), notes: optional(value(formData, "notes")) });
  revalidatePath(periodPath(periodId));
  redirect(periodPath(periodId));
}

export async function updateBudgetItemAction(formData: FormData) {
  const periodId = value(formData, "periodId");
  await updateBudgetItem({ id: value(formData, "id"), name: value(formData, "name"), allocatedAmount: value(formData, "allocatedAmount"), notes: optional(value(formData, "notes")) });
  revalidatePath(periodPath(periodId));
  redirect(`${periodPath(periodId)}/edit`);
}

export async function reviseBudgetItemAction(formData: FormData) {
  const periodId = value(formData, "periodId");
  await reviseBudgetItem({ id: value(formData, "id"), allocatedAmount: value(formData, "allocatedAmount"), reason: value(formData, "reason") });
  revalidatePath(periodPath(periodId));
  redirect(`${periodPath(periodId)}/edit`);
}

export async function verifyBudgetPeriodAction(formData: FormData) {
  const id = value(formData, "id");
  await verifyBudgetPeriod({ id, notes: optional(value(formData, "notes")) });
  revalidatePath("/dashboard/budgets");
  revalidatePath(periodPath(id));
  redirect(periodPath(id));
}

export async function approveBudgetPeriodAction(formData: FormData) {
  const id = value(formData, "id");
  await approveBudgetPeriod({ id, approvalNotes: optional(value(formData, "approvalNotes")) });
  revalidatePath("/dashboard/budgets");
  revalidatePath(periodPath(id));
  redirect(periodPath(id));
}
