import { NextResponse } from "next/server";
import { toDailyQuoteJson } from "@/lib/daily-quote-api";
import { resolveHomeDailyContent } from "@/lib/home-daily-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const query: Record<string, string> = {};
  const date = searchParams.get("date");
  if (date !== null) {
    query.date = date;
  }

  const { content, targetDateKey, isTodayRequest, isDateParamValid } =
    await resolveHomeDailyContent(query);

  if (!isDateParamValid) {
    return NextResponse.json(
      { error: "Invalid date. Use YYYY-MM-DD." },
      { status: 400 },
    );
  }

  if (!content) {
    return NextResponse.json(
      {
        error: isTodayRequest
          ? "No quote is available for today yet."
          : `No quote is available for ${targetDateKey}.`,
      },
      { status: 404 },
    );
  }

  return NextResponse.json(toDailyQuoteJson(content));
}
