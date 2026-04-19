import { NextResponse } from "next/server";
import { z } from "zod";
import { getAppUrl } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/tokens";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  token: z.string().min(10),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ token: url.searchParams.get("token") ?? "" });
  if (!parsed.success) {
    return NextResponse.redirect(
      new URL("/?error=invalid_token", getAppUrl()),
    );
  }

  const tokenHash = hashToken(parsed.data.token);
  const sub = await prisma.subscriber.findFirst({
    where: { verificationTokenHash: tokenHash },
  });

  if (!sub) {
    return NextResponse.redirect(
      new URL("/?error=invalid_token", getAppUrl()),
    );
  }

  const maxAgeMs = 48 * 60 * 60 * 1000;
  if (
    !sub.verificationSentAt ||
    Date.now() - sub.verificationSentAt.getTime() > maxAgeMs
  ) {
    return NextResponse.redirect(
      new URL("/?error=expired_token", getAppUrl()),
    );
  }

  await prisma.subscriber.update({
    where: { id: sub.id },
    data: {
      verifiedAt: new Date(),
      unsubscribedAt: null,
      verificationTokenHash: null,
      verificationSentAt: null,
    },
  });

  return NextResponse.redirect(new URL("/?subscribed=1", getAppUrl()));
}
