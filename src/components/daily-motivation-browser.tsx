"use client";

import { format, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { SubscribeCard } from "@/components/subscribe-card";
import {
  buildDateHref,
  type HomeDailyArchiveItem,
  type HomeDailyContent,
} from "@/lib/home-daily-types";

const PAST_ISSUES_LIMIT = 5;

function truncateQuote(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen - 1).trimEnd()}…`;
}

function formatDisplayDate(localDateKey: string, todayKey: string): string {
  if (localDateKey === todayKey) return "Today";
  return format(parseISO(localDateKey), "MMM d, yyyy");
}

type DailyMotivationBrowserProps = {
  archiveItems: HomeDailyArchiveItem[];
  contentByDate: Record<string, HomeDailyContent>;
  initialContent: HomeDailyContent | null;
  initialDateKey: string;
  todayLocalDateKey: string;
  usedTodayFallback: boolean;
  emptyMessage: string | null;
};

function DailyMotivationDetail({
  content,
  usedTodayFallback,
}: {
  content: HomeDailyContent;
  usedTodayFallback: boolean;
}) {
  return (
    <article className="flex min-w-0 flex-col gap-5 rounded-2xl border border-[var(--surface-border)] bg-white/90 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-sm sm:gap-6 sm:rounded-3xl sm:p-6">
      {usedTodayFallback ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-sm text-amber-900 sm:px-4 sm:py-3">
          Showing the latest available quote while today&apos;s quote is still being
          generated.
        </p>
      ) : null}
      <figure className="mx-auto w-full max-w-full overflow-hidden rounded-xl bg-zinc-100/80 sm:rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL */}
        <img
          src={content.imageCompositedUrl}
          alt="Daily motivation image"
          width={1200}
          height={1500}
          className="mx-auto block h-auto max-h-[min(52vw,15rem)] w-full max-w-full object-contain sm:max-h-[20rem] md:max-h-[24rem]"
        />
      </figure>
      <blockquote className="break-words border-l-4 border-violet-500 pl-4 text-xl font-semibold leading-snug tracking-tight text-zinc-900 sm:pl-5 sm:text-2xl">
        {content.quote}
      </blockquote>
      <div className="max-w-none break-words whitespace-pre-wrap text-[0.9375rem] leading-[1.7] text-zinc-600 sm:text-base sm:leading-[1.75]">
        {content.story}
      </div>
      <p className="text-xs leading-relaxed text-zinc-400">
        Photo from{" "}
        <a
          className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-violet-700"
          href={content.imageSourceUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Unsplash
        </a>
        {content.unsplashAuthorName ? (
          <>
            {" "}
            by{" "}
            <a
              className="text-zinc-600 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-violet-700"
              href={content.unsplashAuthorUrl ?? content.imageSourceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content.unsplashAuthorName}
            </a>
          </>
        ) : null}
        .
      </p>
    </article>
  );
}

function PastIssuesList({
  items,
  selectedDateKey,
  todayLocalDateKey,
  onSelect,
}: {
  items: HomeDailyArchiveItem[];
  selectedDateKey: string;
  todayLocalDateKey: string;
  onSelect: (dateKey: string) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-300/80 bg-white/60 px-4 py-6 text-center text-sm text-zinc-500">
        More past issues will appear here as they are published.
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col">
      <ul className="flex min-w-0 flex-col gap-2">
        {items.map((item) => {
          const isSelected = item.localDateKey === selectedDateKey;
          return (
            <li key={item.localDateKey}>
              <button
                type="button"
                onClick={() => onSelect(item.localDateKey)}
                className={`flex w-full min-w-0 gap-3 rounded-xl border p-2.5 text-left transition-colors sm:p-3 ${
                  isSelected
                    ? "border-violet-300 bg-violet-50 ring-2 ring-violet-500/15"
                    : "border-zinc-200/80 bg-white/90 hover:border-violet-200 hover:bg-violet-50/50"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL */}
                <img
                  src={item.imageCompositedUrl}
                  alt=""
                  width={64}
                  height={64}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover ring-1 ring-zinc-900/5 sm:h-14 sm:w-14"
                />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span
                    className={`text-[0.6875rem] font-semibold uppercase tracking-wide sm:text-xs ${
                      isSelected ? "text-violet-700" : "text-zinc-500"
                    }`}
                  >
                    {formatDisplayDate(item.localDateKey, todayLocalDateKey)}
                  </span>
                  <span className="line-clamp-2 text-sm leading-snug text-zinc-800">
                    {truncateQuote(item.quote, 72)}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function DailyMotivationBrowser({
  archiveItems,
  contentByDate,
  initialContent,
  initialDateKey,
  todayLocalDateKey,
  usedTodayFallback,
  emptyMessage,
}: DailyMotivationBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const preservedParams = useMemo(() => {
    const sp: Record<string, string | string[] | undefined> = {};
    searchParams.forEach((value, key) => {
      sp[key] = value;
    });
    return sp;
  }, [searchParams]);

  const dateFromUrl = searchParams.get("date");
  const selectedDateKey =
    dateFromUrl ?? initialContent?.localDateKey ?? initialDateKey;

  const selectDate = useCallback(
    (dateKey: string) => {
      router.replace(buildDateHref(dateKey, preservedParams), { scroll: false });
    },
    [preservedParams, router],
  );

  const selectedContent =
    contentByDate[selectedDateKey] ??
    (!dateFromUrl && selectedDateKey === initialDateKey ? initialContent : null);

  const showTodayFallback =
    usedTodayFallback &&
    !dateFromUrl &&
    selectedContent?.localDateKey === initialContent?.localDateKey;

  const activeArchiveKey = selectedContent?.localDateKey ?? selectedDateKey;

  const recentPastItems = useMemo(
    () =>
      archiveItems
        .filter((item) => item.localDateKey !== activeArchiveKey)
        .slice(0, PAST_ISSUES_LIMIT),
    [activeArchiveKey, archiveItems],
  );

  return (
    <div className="mx-auto grid w-full min-w-0 max-w-5xl gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col">
        {selectedContent ? (
          <DailyMotivationDetail
            content={selectedContent}
            usedTodayFallback={showTodayFallback}
          />
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300/80 bg-white/70 px-5 py-10 text-center text-sm leading-relaxed text-zinc-600 shadow-sm backdrop-blur-sm sm:rounded-3xl sm:px-8 sm:py-14">
            {emptyMessage ??
              `No quote is available for ${format(parseISO(selectedDateKey), "MMMM d, yyyy")}.`}
          </div>
        )}
      </div>

      <aside className="flex min-w-0 flex-col gap-6 lg:sticky lg:top-8">
        <PastIssuesList
          items={recentPastItems}
          selectedDateKey={activeArchiveKey}
          todayLocalDateKey={todayLocalDateKey}
          onSelect={selectDate}
        />
        <SubscribeCard />
      </aside>
    </div>
  );
}
