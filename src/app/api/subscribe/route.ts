import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rateLimitOrThrow } from "@/lib/rate-limit";
import { hashToken, randomTokenHex } from "@/lib/tokens";
import { parseSubscriberEmail } from "@/lib/validate-subscriber-email";
import { sendVerificationEmail } from "@/lib/send-verification-email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string(),
  website: z.string().optional(),
});

const GENERIC = {
  ok: true,
  message: "If that address can receive mail, you will get a confirmation link shortly.",
};

export async function POST(request: Request) {
  let ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (!ip) ip = "unknown";

  try {
    const json = bodySchema.parse(await request.json());
    if (json.website) {
      return NextResponse.json(GENERIC);
    }

    rateLimitOrThrow(`subscribe:ip:${ip}`, { limit: 20, windowMs: 60 * 60 * 1000 });

    const email = parseSubscriberEmail(json.email);
    rateLimitOrThrow(`subscribe:em:${email}`, { limit: 8, windowMs: 60 * 60 * 1000 });

    const existing = await prisma.subscriber.findUnique({ where: { email } });

    if (existing?.verifiedAt && !existing.unsubscribedAt) {
      return NextResponse.json(GENERIC);
    }

    const now = new Date();
    const cooldownMs = 90_000;
    if (
      existing &&
      !existing.verifiedAt &&
      existing.verificationSentAt &&
      now.getTime() - existing.verificationSentAt.getTime() < cooldownMs
    ) {
      return NextResponse.json(GENERIC);
    }

    const token = randomTokenHex(32);
    const tokenHash = hashToken(token);

    if (!existing) {
      await prisma.subscriber.create({
        data: {
          email,
          unsubscribeToken: randomTokenHex(24),
          verificationTokenHash: tokenHash,
          verificationSentAt: now,
        },
      });
    } else {
      await prisma.subscriber.update({
        where: { email },
        data: {
          verificationTokenHash: tokenHash,
          verificationSentAt: now,
          verifiedAt: null,
        },
      });
    }

    await sendVerificationEmail(email, token);
    return NextResponse.json(GENERIC);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (e instanceof Error && e.message === "RATE_LIMITED") {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }
    if (e instanceof Error && e.message.includes("Invalid email")) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
