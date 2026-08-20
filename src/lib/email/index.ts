import { Resend } from "resend";

export type AuthEmail = {
  to: string;
  subject: string;
  text: string;
  url: string;
};

export async function sendAuthEmail(message: AuthEmail): Promise<void> {
  const provider = process.env.EMAIL_PROVIDER ?? "disabled";

  if (provider === "console") {
    console.info("[auth-email:console]", {
      to: message.to,
      subject: message.subject,
      url: message.url,
    });
    return;
  }
  if (provider === "resend") {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error("Resend email is not fully configured.");
    const result = await new Resend(apiKey).emails.send({ from, to: message.to, subject: message.subject, text: message.text });
    if (result.error) throw new Error("Resend could not deliver the email.");
    return;
  }

  throw new Error(
    "Email delivery is not configured. Set EMAIL_PROVIDER=console for local development or add a provider adapter.",
  );
}
