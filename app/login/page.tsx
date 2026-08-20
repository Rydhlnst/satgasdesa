import { AuthShell } from "@/src/features/auth/components/auth-shell";
import { LoginForm } from "@/src/features/auth/components/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      title="Masuk"
      description="Gunakan akun internal yang diberikan oleh administrator organisasi Anda."
    >
      <LoginForm />
    </AuthShell>
  );
}
