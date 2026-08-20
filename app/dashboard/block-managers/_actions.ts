"use server";

import { revalidatePath } from "next/cache";
import { assignBlockManager, closeBlockManager } from "@/src/features/block-managers/service";

function value(formData: FormData, key: string): string { const item = formData.get(key); return typeof item === "string" ? item.trim() : ""; }
function optional(valueToCheck: string): string | undefined { return valueToCheck || undefined; }

export async function assignBlockManagerAction(formData: FormData) { await assignBlockManager({ blockId: value(formData, "blockId"), assignmentRole: value(formData, "assignmentRole"), personName: value(formData, "personName"), contact: optional(value(formData, "contact")), startedAt: value(formData, "startedAt"), notes: optional(value(formData, "notes")) }); revalidatePath("/dashboard/block-managers"); revalidatePath(`/dashboard/blocks/${value(formData, "blockId")}`); }
export async function closeBlockManagerAction(formData: FormData) { await closeBlockManager({ id: value(formData, "id"), endedAt: value(formData, "endedAt") }); revalidatePath("/dashboard/block-managers"); }
