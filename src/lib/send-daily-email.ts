import { Resend } from "resend";
import type { DailyContent, Subscriber } from "@/generated/prisma/client";
import { escapeHtml } from "@/lib/html";
import { getAppUrl, requireEnv } from "@/lib/env";

export async function sendDailyDigestEmail(opts: {
  content: DailyContent;
  subscriber: Pick<Subscriber, "id" | "email" | "unsubscribeToken">;
}): Promise<{ resendEmailId: string }> {
  const resend = new Resend(requireEnv("RESEND_API_KEY"));
  const from = requireEnv("EMAIL_FROM");
  const base = getAppUrl().replace(/\/$/, "");
  const unsubUrl = `${base}/api/unsubscribe?token=${encodeURIComponent(
    opts.subscriber.unsubscribeToken,
  )}`;

  const author = opts.content.unsplashAuthorName
    ? `${escapeHtml(opts.content.unsplashAuthorName)} on Unsplash`
    : "Unsplash";
  const authorLink = opts.content.unsplashAuthorUrl
    ? escapeHtml(opts.content.unsplashAuthorUrl)
    : escapeHtml(opts.content.imageSourceUrl);

  const storyHtml = escapeHtml(opts.content.story)
    .split(/\n\n+/)
    .map((p) => `<p style="margin:0 0 14px 0;line-height:1.6;">${p}</p>`)
    .join("");

  const { data, error } = await resend.emails.send({
    from,
    to: opts.subscriber.email,
    subject: `Your daily motivation — ${opts.content.localDateKey}`,
    html: `
      <div style="font-family: system-ui, -apple-system, Segoe UI, sans-serif; max-width: 640px; margin: 0 auto;">
        <img src="${escapeHtml(opts.content.imageCompositedUrl)}" alt="" width="600" style="max-width:100%;height:auto;border-radius:12px;" />
        <h1 style="font-size: 20px; margin: 18px 0 8px;">${escapeHtml(opts.content.quote)}</h1>
        <div style="color:#374151;">${storyHtml}</div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0;" />
        <p style="font-size: 12px; color:#6b7280;">
          Photo credit: <a href="${authorLink}">${author}</a>.
        </p>
        <p style="font-size: 12px; color:#6b7280;">
          <a href="${unsubUrl}">Unsubscribe</a>
        </p>
      </div>
    `,
    text: `${opts.content.quote}\n\n${opts.content.story}\n\nUnsubscribe: ${unsubUrl}`,
  });

  if (error) {
    throw new Error(error.message);
  }
  if (!data?.id) {
    throw new Error("Resend did not return an email id");
  }
  return { resendEmailId: data.id };
}
