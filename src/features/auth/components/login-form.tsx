"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { z } from "zod";
import { LockKeyhole, Mail } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormErrorToast } from "@/components/shared/action-feedback";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/src/lib/auth/auth-client";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
});

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData(event.currentTarget);
    const values = loginSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!values.success) {
      setError(values.error.issues[0]?.message ?? "Check your credentials.");
      return;
    }

    setIsPending(true);
    const response = await authClient.signIn.email({
      email: values.data.email,
      password: values.data.password,
      callbackURL: "/dashboard",
    });

    if (response.error) {
      setError(response.error.message ?? "Unable to sign in.");
      setIsPending(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <FormErrorToast error={error} />
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <div className="relative">
          <Mail aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 rounded-lg border border-input bg-background/60 px-3 pl-10 shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20" id="email" name="email" type="email" autoComplete="email" required />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="password">Kata sandi</Label>
          <Link className="text-xs font-medium text-primary underline-offset-4 hover:underline" href="/forgot-password">
            Lupa kata sandi?
          </Link>
        </div>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 rounded-lg border border-input bg-background/60 px-3 pl-10 shadow-sm focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20" id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
      </div>
      <Button className="h-11 w-full rounded-lg shadow-sm shadow-primary/20" disabled={isPending} type="submit">
        {isPending ? "Memasukkan…" : "Masuk"}
      </Button>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Akun dibuat oleh administrator yang berwenang. Pendaftaran publik dinonaktifkan.
      </p>
    </form>
  );
}
