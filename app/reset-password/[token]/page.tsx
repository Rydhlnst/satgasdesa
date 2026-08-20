import { redirect } from "next/navigation";

export default async function ResetPasswordTokenPage({ params }: PageProps<"/reset-password/[token]">) {
  const { token } = await params;
  redirect(`/reset-password?token=${encodeURIComponent(token)}`);
}
