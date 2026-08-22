"use client";

import { useEffect, useRef, useState, useTransition, type ComponentProps, type FormEvent, type ReactNode, type Ref } from "react";
import { toast } from "sonner";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UI_MESSAGES } from "@/src/lib/ui/messages";

export type FormServerAction = (formData: FormData) => Promise<unknown>;

export function getActionErrorMessage(error: unknown): string {
  const raw = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  const message = raw.trim().toLowerCase();
  if (message.includes("unauthorized") || message.includes("permission") || message.includes("izin")) return UI_MESSAGES.states.unauthorized.description;
  if (message.includes("not found") || message.includes("tidak ditemukan")) return UI_MESSAGES.states.notFound.description;
  if (message.includes("already") || message.includes("immutable") || message.includes("sudah")) return "Data ini sudah diproses dan tidak dapat diubah dengan tindakan tersebut.";
  if (message.includes("required") || message.includes("invalid") || message.includes("check") || message.includes("periksa")) return "Periksa kembali data yang diisi lalu coba lagi.";
  if (message.includes("network") || message.includes("offline") || message.includes("koneksi")) return UI_MESSAGES.states.offline.description;
  return UI_MESSAGES.states.error.description;
}

export function showActionError(error: unknown): void {
  const message = getActionErrorMessage(error);
  toast.error(message, { id: `action-error:${message}` });
}

function isRedirectError(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("digest" in error)) return false;
  const digest = (error as { digest?: unknown }).digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT");
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
  formRef?: Ref<HTMLFormElement>;
  onBeforeSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  successMessage?: string | null;
};

export function ActionForm({ action, children, formRef, onBeforeSubmit, successMessage = "Perubahan berhasil disimpan.", ...props }: ActionFormProps) {
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onBeforeSubmit?.(event);
    if (event.defaultPrevented) return;

    const formData = new FormData(event.currentTarget);
    startTransition(() => {
      void action(formData)
        .then(() => {
          if (successMessage) toast.success(successMessage);
        })
        .catch((error: unknown) => {
          if (isRedirectError(error)) {
            if (successMessage) toast.success(successMessage);
            return;
          }
          showActionError(error);
        });
    });
  }

  return <form {...props} ref={formRef} aria-busy={isPending} onSubmit={handleSubmit}><fieldset className="contents" disabled={isPending}>{children}</fieldset></form>;
}

type ConfirmActionFormProps = ActionFormProps & {
  confirmTitle: string;
  confirmDescription: string;
  confirmActionLabel?: string;
};

export function ConfirmActionForm({ confirmTitle, confirmDescription, confirmActionLabel = "Lanjutkan", onBeforeSubmit, ...props }: ConfirmActionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const confirmed = useRef(false);

  function handleBeforeSubmit(event: FormEvent<HTMLFormElement>) {
    onBeforeSubmit?.(event);
    if (event.defaultPrevented || confirmed.current) {
      confirmed.current = false;
      return;
    }
    event.preventDefault();
    setOpen(true);
  }

  function confirmAction() {
    confirmed.current = true;
    setOpen(false);
    window.setTimeout(() => formRef.current?.requestSubmit(), 0);
  }

  return <><ActionForm {...props} formRef={formRef} onBeforeSubmit={handleBeforeSubmit} /><AlertDialog onOpenChange={setOpen} open={open}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmTitle}</AlertDialogTitle><AlertDialogDescription>{confirmDescription}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmAction}>{confirmActionLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}
