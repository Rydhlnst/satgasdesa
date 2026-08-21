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

const passwordSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters."),
    confirmPassword: z.string().min(8, "Confirm your password."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetPasswordFormProps = {
  token?: string;
};

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const [error, setError] = useState<string | null>(token ? null : "This reset link is incomplete.");
  const [complete, setComplete] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!token) {
      setError("This reset link is incomplete.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const values = passwordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!values.success) {
      setError(values.error.issues[0]?.message ?? "Check your password.");
      return;
    }

    setIsPending(true);
    const response = await authClient.resetPassword({
      newPassword: values.data.password,
      token,
    });

    if (response.error) {
      setError(response.error.message ?? "Unable to reset your password.");
      setIsPending(false);
      return;
    }

    setComplete(true);
    setIsPending(false);
  }

  if (complete) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>Your password has been updated. You can now sign in.</AlertDescription>
        </Alert>
        <Button asChild className="w-full">
          <Link href="/login">Continue to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormErrorToast error={error} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" required />
      </div>
      <Button className="w-full" disabled={isPending || !token} type="submit">
        {isPending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
