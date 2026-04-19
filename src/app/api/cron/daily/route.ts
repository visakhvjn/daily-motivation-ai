import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { getAppTimezone, requireEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import {
  getTodayLocalDateKey,
  isWithinDailySendWindow,
} from "@/lib/daily-date";
import { generateDailyContentForDateKey } from "@/lib/generate-daily-content";
import { sendDailyDigestEmail } from "@/lib/send-daily-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Vercel Cron is UTC-only (`vercel.json` uses `0 * * * *`).
 * We only run the expensive send between 09:00–09:14 in `APP_TIMEZONE`
 * to approximate a 9am local send across DST without maintaining two UTC crons.
 */
async function handle(request: Request) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const timeZone = getAppTimezone();
  const now = new Date();

  if (!isWithinDailySendWindow(now, timeZone)) {
    return NextResponse.json({ ok: true, skipped: "outside_send_window" });
  }

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
