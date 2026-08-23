"use client";

import { useRef, useState, type ComponentProps, type FormEvent, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { type FormServerAction } from "@/components/shared/action-form";

type ConfirmActionFormProps = Omit<ComponentProps<"form">, "action" | "onSubmit"> & {
  action: FormServerAction;
  children: ReactNode;
  confirmTitle: string;
  confirmDescription: string;
  confirmActionLabel?: string;
};

export function ConfirmActionForm({ action, children, confirmTitle, confirmDescription, confirmActionLabel = "Lanjutkan", ...props }: ConfirmActionFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const confirmed = useRef(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (confirmed.current) {
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

  return <><form {...props} action={action} ref={formRef} onSubmit={handleSubmit}><ConfirmActionFields>{children}</ConfirmActionFields></form><AlertDialog onOpenChange={setOpen} open={open}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmTitle}</AlertDialogTitle><AlertDialogDescription>{confirmDescription}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={confirmAction}>{confirmActionLabel}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>;
}

function ConfirmActionFields({ children }: { children: ReactNode }) {
  const { pending } = useFormStatus();
  return <fieldset className="contents" disabled={pending}>{children}</fieldset>;
}
