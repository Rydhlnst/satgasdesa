"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createFundRequest, transitionFundRequest } from "@/src/features/fund-requests/service";

function value(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function optional(formData: FormData, key: string): string | undefined {
  return value(formData, key) || undefined;
}

export async function createFundRequestAction(formData: FormData) {
  const result = await createFundRequest({
    budgetPeriodId: value(formData, "budgetPeriodId"),
    budgetCategoryId: value(formData, "budgetCategoryId"),
    blockId: optional(formData, "blockId"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    amount: value(formData, "amount"),
    requestedAt: value(formData, "requestedAt"),
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fund-requests");
  redirect(`/dashboard/fund-requests/${result.id}`);
}

export async function transitionFundRequestAction(formData: FormData) {
  const id = value(formData, "id");
  await transitionFundRequest({ id, status: value(formData, "status"), notes: optional(formData, "notes") });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/fund-requests");
  revalidatePath(`/dashboard/fund-requests/${id}`);
  redirect(`/dashboard/fund-requests/${id}`);
}
