"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { getActionErrorMessage } from "@/components/shared/action-form";

export function showActionError(error: unknown): void {
  const message = getActionErrorMessage(error);
  toast.error(message, { id: `action-error:${message}` });
}

export function FormErrorToast({ error }: { error: unknown }) {
  if (error) return <ErrorToastEffect message={getActionErrorMessage(error)} />;
  return null;
}

function ErrorToastEffect({ message }: { message: string }) {
  useEffect(() => {
    toast.error(message, { id: `action-error:${message}` });
  }, [message]);
  return null;
}
