import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const LOCAL_DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ date: string }> },
) {
  const { date } = await context.params;
  if (!LOCAL_DATE_KEY.test(date)) {
    return new NextResponse("Bad request", { status: 400 });
  }

  if (!process.env.DATABASE_URL) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  const row = await prisma.dailyContent.findUnique({
    where: { localDateKey: date },
    select: { imageCompositedUrl: true },
  });

  if (!row) {
    return new NextResponse("Not found", { status: 404 });
  }

  const upstream = await fetch(row.imageCompositedUrl);
  if (!upstream.ok) {
    return new NextResponse("Upstream error", { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "image/jpeg";

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
