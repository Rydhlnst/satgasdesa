import { AuthShell } from "@/src/features/auth/components/auth-shell";
import { ForgotPasswordForm } from "@/src/features/auth/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password"
      description="Request a secure password reset link for your internal account."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
