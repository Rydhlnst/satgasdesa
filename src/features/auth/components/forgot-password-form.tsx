"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { z } from "zod";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormErrorToast } from "@/components/shared/action-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/src/lib/auth/auth-client";

const emailSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export function ForgotPasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const values = emailSchema.safeParse({ email: formData.get("email") });

    if (!values.success) {
      setError(values.error.issues[0]?.message ?? "Enter a valid email address.");
      return;
    }

    setIsPending(true);
    const response = await authClient.requestPasswordReset({
      email: values.data.email,
      redirectTo: "/reset-password",
    });

    if (response.error) {
      setError(response.error.message ?? "Unable to send the reset email.");
      setIsPending(false);
      return;
    }

    setSent(true);
    setIsPending(false);
  }

  return (
    <div className="space-y-6">
      {sent ? (
        <Alert>
          <AlertDescription>
            If an account exists for that email, a password reset link has been sent.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormErrorToast error={error} />
      <form className="space-y-6" noValidate onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <Button className="w-full" disabled={isPending} type="submit">
          {isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <Link className="block text-center text-xs text-muted-foreground underline underline-offset-4" href="/login">
        Back to sign in
      </Link>
    </div>
  );
}
