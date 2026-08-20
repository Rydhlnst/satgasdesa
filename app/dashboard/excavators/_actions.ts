"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { recordExcavatorMovement, registerExcavator } from "@/src/features/excavators/service";

function value(formData: FormData, key: string): string {
  const item = formData.get(key);
  return typeof item === "string" ? item.trim() : "";
}

function optional(valueToCheck: string): string | undefined {
  return valueToCheck || undefined;
}

export async function registerExcavatorAction(formData: FormData) {
  const result = await registerExcavator({
    unitCode: value(formData, "unitCode"),
    brand: value(formData, "brand"),
    model: value(formData, "model"),
    operatorName: optional(value(formData, "operatorName")),
    currentBlockId: optional(value(formData, "currentBlockId")),
    entryDate: optional(value(formData, "entryDate")),
    notes: optional(value(formData, "notes")),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/excavators");
  redirect(`/dashboard/excavators/${result.id}`);
}

export async function recordExcavatorMovementAction(formData: FormData) {
  const occurredAt = value(formData, "occurredAt");
  const result = await recordExcavatorMovement({
    excavatorId: value(formData, "excavatorId"),
    movementType: value(formData, "movementType"),
    toBlockId: optional(value(formData, "toBlockId")),
    occurredAt: occurredAt ? new Date(`${occurredAt}T00:00:00.000Z`) : undefined,
    notes: optional(value(formData, "notes")),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/excavators");
  revalidatePath(`/dashboard/excavators/${result.excavatorId}`);
  redirect(`/dashboard/excavators/${result.excavatorId}`);
}
