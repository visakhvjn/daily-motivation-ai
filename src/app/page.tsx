import type { Metadata } from "next";
import { Suspense } from "react";
import { DailyMotivationBrowser } from "@/components/daily-motivation-browser";
import { getAppTimezone, getAppUrl } from "@/lib/env";
import { getTodayLocalDateKey } from "@/lib/daily-date";
import {
  fetchAllHomeDailyContent,
  firstSearchParam,
  resolveHomeDailyContent,
} from "@/lib/home-daily-content";
import { getShareImageUrl } from "@/lib/share-image-url";

export const dynamic = "force-dynamic";

function truncateForMeta(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = (await searchParams) ?? {};
  const { content, targetDateKey, isDateParamValid } = await resolveHomeDailyContent(sp);

  const base = new URL("/", getAppUrl());
  const dateParam = firstSearchParam(sp.date);
  if (dateParam !== undefined && isDateParamValid) {
    base.searchParams.set("date", targetDateKey);
  }

  if (!content) {
    return {
      title: "Daily Motivation",
      description: "A daily motivational quote, image, and short story — by email.",
      alternates: { canonical: base.pathname + base.search },
      openGraph: {
        title: "Daily Motivation",
        description: "A daily motivational quote, image, and short story — by email.",
        url: base,
        type: "website",
      },
    };
  }

  const quoteTitle = truncateForMeta(content.quote, 200);
  const storyDescription = truncateForMeta(content.story, 2000);
  const titleForTab = `${truncateForMeta(content.quote, 72)} · Daily Motivation`;
  const previewImageUrl = getShareImageUrl(content.localDateKey);

  return {
    title: titleForTab,
    description: storyDescription,
    alternates: { canonical: base.pathname + base.search },
    openGraph: {
      title: quoteTitle,
      description: storyDescription,
      siteName: "Daily Motivation",
      url: base,
      type: "article",
      images: [
        {
          url: previewImageUrl,
          alt: truncateForMeta(content.quote, 120),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: quoteTitle,
      description: storyDescription,
      images: [previewImageUrl],
    },
  };
}

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

function emptyMessageForHome(
  hasDatabase: boolean,
  isDateParamValid: boolean,
  isTodayRequest: boolean,
  targetDateKey: string,
): string | null {
  if (!hasDatabase) {
    return "Set DATABASE_URL to load today’s content from the database.";
  }
  if (!isDateParamValid) {
    return "Invalid date format. Use YYYY-MM-DD.";
  }
  if (!isTodayRequest) {
    return `No quote is available for ${targetDateKey}.`;
  }
  return "No issue has been generated for today yet. The scheduled job will create it automatically.";
}

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = (await searchParams) ?? {};
  const banner = bannerFromSearchParams(sp);
  const todayLocalDateKey = getTodayLocalDateKey(getAppTimezone());

  const [
    {
      content,
      targetDateKey,
      isTodayRequest,
      usedTodayFallback,
      isDateParamValid,
    },
    { items: archiveItems, byDate: contentByDate },
  ] = await Promise.all([resolveHomeDailyContent(sp), fetchAllHomeDailyContent()]);

  const hasDatabase = Boolean(process.env.DATABASE_URL);
  const emptyMessage =
    content || archiveItems.length > 0
      ? null
      : emptyMessageForHome(hasDatabase, isDateParamValid, isTodayRequest, targetDateKey);

  return (
    <div className="relative isolate min-h-full flex-1 bg-[var(--background)] text-zinc-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.12),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-72 w-72 rounded-full bg-violet-200/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 bottom-32 h-64 w-64 rounded-full bg-amber-100/40 blur-3xl"
      />

      <main className="relative mx-auto flex w-full min-w-0 max-w-5xl flex-col items-center gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 lg:py-16">
        <header className="flex w-full max-w-2xl flex-col items-center gap-3 text-center sm:gap-4">
          <span className="inline-flex w-fit items-center rounded-full border border-violet-200/80 bg-violet-50 px-3 py-1 text-xs font-semibold tracking-wide text-violet-800 uppercase">
            Daily Motivation
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Your daily dose of motivation
          </h1>
          <p className="text-sm leading-relaxed text-zinc-600 sm:text-base">
            Read today&apos;s quote and story, or pick a recent issue from the list.
          </p>
        </header>

        {banner ? (
          <div
            role="status"
            className={`w-full max-w-5xl ${
              banner.tone === "success"
                ? "rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-5 py-4 text-center text-sm text-emerald-900 shadow-sm"
                : "rounded-2xl border border-red-200/80 bg-red-50/90 px-5 py-4 text-center text-sm text-red-900 shadow-sm"
            }`}
          >
            {banner.text}
          </div>
        ) : null}

        <Suspense
          fallback={
            <div className="w-full max-w-5xl rounded-3xl border border-zinc-200/80 bg-white/70 px-8 py-20 text-center text-sm text-zinc-500">
              Loading…
            </div>
          }
        >
          <DailyMotivationBrowser
            archiveItems={archiveItems}
            contentByDate={contentByDate}
            initialContent={content}
            initialDateKey={content?.localDateKey ?? targetDateKey}
            todayLocalDateKey={todayLocalDateKey}
            usedTodayFallback={usedTodayFallback}
            emptyMessage={emptyMessage}
          />
        </Suspense>
      </main>
    </div>
  );
}
