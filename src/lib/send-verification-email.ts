import { Resend } from "resend";
import { getAppUrl, requireEnv } from "@/lib/env";

export async function sendVerificationEmail(to: string, token: string) {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("EMAIL_FROM");
  const base = getAppUrl().replace(/\/$/, "");
  const verifyUrl = `${base}/api/subscribe/verify?token=${encodeURIComponent(token)}`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "Confirm your Daily Motivation subscription",
    html: `
      <p>Thanks for signing up.</p>
      <p><a href="${verifyUrl}">Click here to confirm your email</a> (link expires in 48 hours).</p>
      <p>If you did not request this, you can ignore this message.</p>
    `,
    text: `Confirm your subscription: ${verifyUrl}`,
  });

  if (error) {
    throw new Error(error.message);
  }
}
