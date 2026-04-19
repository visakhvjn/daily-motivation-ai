import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { requireEnv } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ResendEvent = {
  type: string;
  created_at: string;
  data: {
    email_id: string;
    to?: string[];
  };
};

export async function POST(request: Request) {
  const secret = requireEnv("RESEND_WEBHOOK_SECRET");
  const payload = await request.text();

  const svixId = request.headers.get("svix-id");
  const svixTimestamp = request.headers.get("svix-timestamp");
  const svixSignature = request.headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  let evt: ResendEvent;
  try {
    evt = new Webhook(secret).verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendEvent;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const emailId = evt.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ ok: true });
  }

  const ts = new Date(evt.created_at);

  switch (evt.type) {
    case "email.delivered": {
      await prisma.emailSend.updateMany({
        where: { resendEmailId: emailId },
        data: { deliveredAt: ts },
      });
      break;
    }
    case "email.opened": {
      const row = await prisma.emailSend.findUnique({
        where: { resendEmailId: emailId },
      });
      if (!row) break;
      if (!row.firstOpenedAt) {
        await prisma.emailSend.update({
          where: { id: row.id },
          data: { firstOpenedAt: ts, openCount: { increment: 1 } },
        });
      } else {
        await prisma.emailSend.update({
          where: { id: row.id },
          data: { openCount: { increment: 1 } },
        });
      }
      break;
    }
    case "email.bounced": {
      await prisma.emailSend.updateMany({
        where: { resendEmailId: emailId },
        data: { bouncedAt: ts },
      });
      break;
    }
    case "email.complained": {
      const row = await prisma.emailSend.findUnique({
        where: { resendEmailId: emailId },
        select: { id: true, subscriberId: true },
      });
      if (row) {
        await prisma.$transaction([
          prisma.emailSend.update({
            where: { id: row.id },
            data: { complainedAt: ts },
          }),
          prisma.subscriber.update({
            where: { id: row.subscriberId },
            data: { unsubscribedAt: ts },
          }),
        ]);
      }
      break;
    }
    default:
      break;
  }

  return NextResponse.json({ ok: true });
}
