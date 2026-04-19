import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  token: z.string().min(8),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ token: url.searchParams.get("token") ?? "" });
  if (!parsed.success) {
    return new NextResponse("Invalid unsubscribe link", { status: 400 });
  }

  const updated = await prisma.subscriber.updateMany({
    where: { unsubscribeToken: parsed.data.token },
    data: { unsubscribedAt: new Date() },
  });

  if (updated.count === 0) {
    return new NextResponse("Invalid unsubscribe link", { status: 404 });
  }

  return new NextResponse("You have been unsubscribed.", {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
