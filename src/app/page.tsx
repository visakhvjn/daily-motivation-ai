import { SubscribeForm } from "@/app/subscribe-form";
import { getAppTimezone } from "@/lib/env";
import { getTodayLocalDateKey } from "@/lib/daily-date";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function bannerFromSearchParams(sp: Record<string, string | string[] | undefined>) {
  if (sp.subscribed === "1") {
    return { tone: "success" as const, text: "You are subscribed. Thanks for confirming your email." };
  }
  if (sp.error === "invalid_token") {
    return { tone: "error" as const, text: "That confirmation link is invalid." };
  }
  if (sp.error === "expired_token") {
    return { tone: "error" as const, text: "That confirmation link has expired. Please subscribe again." };
  }
  return null;
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const banner = bannerFromSearchParams(sp);

  const timeZone = getAppTimezone();
  const localDateKey = getTodayLocalDateKey(timeZone);

  let content: {
    quote: string;
    story: string;
    imageCompositedUrl: string;
    imageSourceUrl: string;
    unsplashAuthorName: string | null;
    unsplashAuthorUrl: string | null;
  } | null = null;

  if (process.env.DATABASE_URL) {
    content = await prisma.dailyContent.findUnique({
      where: { localDateKey },
      select: {
        quote: true,
        story: true,
        imageCompositedUrl: true,
        imageSourceUrl: true,
        unsplashAuthorName: true,
        unsplashAuthorUrl: true,
      },
    });
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <main className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-6 py-14">
        <header className="flex flex-col gap-3">
          <p className="text-sm font-medium text-zinc-500">Daily Motivation</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Today&apos;s note
          </h1>
        </header>

        {banner ? (
          <div
            className={
              banner.tone === "success"
                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
                : "rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
            }
          >
            {banner.text}
          </div>
        ) : null}

        {content ? (
          <article className="flex flex-col gap-6">
            {/* eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL */}
            <img
              src={content.imageCompositedUrl}
              alt="Motivation image with quote"
              className="w-full rounded-2xl border border-zinc-200 shadow-sm"
            />
            <blockquote className="text-xl font-semibold leading-snug text-zinc-900">
              {content.quote}
            </blockquote>
            <div className="max-w-none whitespace-pre-wrap text-base leading-relaxed text-zinc-700">
              {content.story}
            </div>
            <p className="text-xs text-zinc-500">
              Photo from{" "}
              <a className="underline" href={content.imageSourceUrl}>
                Unsplash
              </a>
              {content.unsplashAuthorName ? (
                <>
                  {" "}
                  by{" "}
                  <a
                    className="underline"
                    href={content.unsplashAuthorUrl ?? content.imageSourceUrl}
                  >
                    {content.unsplashAuthorName}
                  </a>
                </>
              ) : null}
              .
            </p>
          </article>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center text-sm text-zinc-600">
            {process.env.DATABASE_URL
              ? "No issue has been generated for today yet. The scheduled job will create it automatically."
              : "Set DATABASE_URL to load today’s content from the database."}
          </div>
        )}

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Get the daily email</h2>
          <p className="mt-2 text-sm text-zinc-600">
            Enter your email and confirm via the link we send you. We only mail
            verified subscribers.
          </p>
          <SubscribeForm />
        </section>
      </main>
    </div>
  );
}
