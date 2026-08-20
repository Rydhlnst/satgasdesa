import { AuthShell } from "@/src/features/auth/components/auth-shell";
import { ResetPasswordForm } from "@/src/features/auth/components/reset-password-form";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string | string[] }>;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : undefined;

  return (
    <AuthShell
      title="Reset password"
      description="Choose a new password for your internal account."
    >
      <ResetPasswordForm token={token} />
    </AuthShell>
  );
}
