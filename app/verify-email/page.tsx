import Link from "next/link";

import { AuthShell } from "@/src/features/auth/components/auth-shell";

export default function VerifyEmailPage() {
  return (
    <AuthShell
      title="Check your email"
      description="Use the verification link sent to your registered email address before signing in."
    >
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Verification links expire. If you need another link, return to sign in and request one after your account administrator confirms your email address.
        </p>
        <Link className="block text-center text-xs text-muted-foreground underline underline-offset-4" href="/login">
          Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
