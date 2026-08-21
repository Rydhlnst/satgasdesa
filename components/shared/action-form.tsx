"use client";

import { useEffect, useTransition, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

export type FormServerAction = (formData: FormData) => Promise<unknown>;

export function getActionErrorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim()) return error;
  return error instanceof Error && error.message.trim()
    ? error.message
    : "Operation failed. Please try again.";
}

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

type ActionFormProps = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: FormServerAction;
  children: ReactNode;
  onBeforeSubmit?: (event: FormEvent<HTMLFormElement>) => void;
};

export function ActionForm({ action, children, onBeforeSubmit, ...props }: ActionFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBeforeSubmit?.(event);
    if (event.defaultPrevented) return;

    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      void action(formData).catch(showActionError);
    });
  }

  return <form {...props} aria-busy={isPending} noValidate onSubmit={handleSubmit}><fieldset className="contents" disabled={isPending}>{children}</fieldset></form>;
}
