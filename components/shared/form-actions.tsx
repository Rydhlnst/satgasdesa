"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

type FormActionsProps = { submitLabel: string; pendingLabel?: string; secondary?: ReactNode };

export function FormActions({ submitLabel, pendingLabel = "Menyimpan…", secondary }: FormActionsProps) {
  const { pending } = useFormStatus();
  return <div className="sticky bottom-0 z-10 -mx-6 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-card/95 px-6 py-4 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">{secondary}{<Button disabled={pending} type="submit">{pending ? pendingLabel : submitLabel}</Button>}</div>;
}
