import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { getAppTimezone, requireEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { getTodayLocalDateKey } from "@/lib/daily-date";
import { generateDailyContentForDateKey } from "@/lib/generate-daily-content";
import { sendDailyDigestEmail } from "@/lib/send-daily-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vercel **Hobby** allows at most **one** cron invocation per day, so the schedule
 * in `vercel.json` must be daily (UTC). Default `0 14 * * *` is ~09:00 in
 * `America/New_York` during **EST** (UTC−5). For ~09:00 during **EDT**, use
 * `0 13 * * *` instead. `APP_TIMEZONE` still defines which calendar day is “today”.
 */
async function handle(request: Request) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timeZone = getAppTimezone();

  requireEnv("DATABASE_URL");
  requireEnv("OPENAI_API_KEY");
  requireEnv("UNSPLASH_ACCESS_KEY");
  requireEnv("BLOB_READ_WRITE_TOKEN");
  requireEnv("RESEND_API_KEY");
  requireEnv("EMAIL_FROM");

  const localDateKey = getTodayLocalDateKey(timeZone);

  const content = await generateDailyContentForDateKey(localDateKey);

  const lock = await prisma.dailyContent.updateMany({
    where: { id: content.id, emailsSentAt: null },
    data: { emailsSentAt: new Date() },
  });

  if (lock.count === 0) {
    return NextResponse.json({ ok: true, skipped: "already_sent" });
  }

  const subscribers = await prisma.subscriber.findMany({
    where: { verifiedAt: { not: null }, unsubscribedAt: null },
    select: { id: true, email: true, unsubscribeToken: true },
  });

  try {
    for (const sub of subscribers) {
      const { resendEmailId } = await sendDailyDigestEmail({
        content,
        subscriber: sub,
      });
      await prisma.emailSend.create({
        data: {
          dailyContentId: content.id,
          subscriberId: sub.id,
          resendEmailId,
        },
      });
    }
  } catch (e) {
    await prisma.dailyContent.update({
      where: { id: content.id },
      data: { emailsSentAt: null },
    });
    throw e;
  }

  return NextResponse.json({
    ok: true,
    localDateKey,
    sent: subscribers.length,
  });
}

export async function GET(request: Request) {
  try {
    return await handle(request);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
