import { NextResponse } from "next/server";
import { assertCronAuthorized } from "@/lib/cron-auth";
import { getAppTimezone, requireEnv } from "@/lib/env";
import { getTodayLocalDateKey } from "@/lib/daily-date";
import { generateDailyContentForDateKey } from "@/lib/generate-daily-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Manually create (or return existing) today's `DailyContent` without sending emails.
 * Same auth as cron: `Authorization: Bearer $CRON_SECRET` or `?secret=$CRON_SECRET`.
 */
async function handle(request: Request) {
  try {
    assertCronAuthorized(request);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  requireEnv("DATABASE_URL");
  requireEnv("OPENAI_API_KEY");
  requireEnv("UNSPLASH_ACCESS_KEY");
  requireEnv("BLOB_READ_WRITE_TOKEN");

  const timeZone = getAppTimezone();
  const localDateKey = getTodayLocalDateKey(timeZone);
  const content = await generateDailyContentForDateKey(localDateKey);

  return NextResponse.json({
    ok: true,
    localDateKey,
    id: content.id,
    quote: content.quote,
    imageCompositedUrl: content.imageCompositedUrl,
  });
}

export async function POST(request: Request) {
  try {
    return await handle(request);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
