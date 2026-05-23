"use client";

import { format, parseISO } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  buildDateHref,
  type HomeDailyArchiveItem,
  type HomeDailyContent,
} from "@/lib/home-daily-types";

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
    <article className="flex min-w-0 flex-col gap-8 rounded-3xl border border-[var(--surface-border)] bg-white/90 p-6 shadow-[0_8px_30px_rgba(0,0,0,0.04)] backdrop-blur-sm sm:p-8">
      {usedTodayFallback ? (
        <p className="rounded-xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Showing the latest available quote while today&apos;s quote is still being
          generated.
        </p>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL */}
      <img
        src={content.imageCompositedUrl}
        alt="Daily motivation image"
        className="w-full rounded-2xl shadow-md ring-1 ring-zinc-900/5"
      />
      <blockquote className="border-l-4 border-violet-500 pl-5 text-2xl font-semibold leading-snug tracking-tight text-zinc-900 sm:text-3xl">
        {content.quote}
      </blockquote>
      <div className="max-w-none whitespace-pre-wrap text-base leading-[1.75] text-zinc-600">
        {content.story}
      </div>
      <p className="text-xs text-zinc-400">
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

function ArchiveScroller({
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
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const el = itemRefs.current[selectedDateKey];
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedDateKey]);

  if (items.length === 0) {
    return (
      <aside className="rounded-2xl border border-dashed border-zinc-300/80 bg-white/60 px-4 py-8 text-center text-sm text-zinc-500">
        Past issues will appear here once they are published.
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col gap-3 lg:sticky lg:top-8 lg:max-h-[calc(100vh-6rem)]">
      <div className="flex items-center justify-between gap-2 px-1">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-900">
          Past issues
        </h2>
        <span className="text-xs text-zinc-400">{items.length}</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 lg:-mx-1 lg:flex-col lg:overflow-x-visible lg:overflow-y-auto lg:px-1 lg:pb-1">
        {items.map((item) => {
          const isSelected = item.localDateKey === selectedDateKey;
          return (
            <button
              key={item.localDateKey}
              ref={(node) => {
                itemRefs.current[item.localDateKey] = node;
              }}
              type="button"
              onClick={() => onSelect(item.localDateKey)}
              className={`flex w-[min(100%,280px)] shrink-0 gap-3 rounded-2xl border p-3 text-left transition-all lg:w-full ${
                isSelected
                  ? "border-violet-300 bg-violet-50 shadow-sm ring-2 ring-violet-500/20"
                  : "border-zinc-200/80 bg-white/90 hover:border-violet-200 hover:bg-violet-50/50"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- remote Vercel Blob URL */}
              <img
                src={item.imageCompositedUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-zinc-900/5"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    isSelected ? "text-violet-700" : "text-zinc-500"
                  }`}
                >
                  {formatDisplayDate(item.localDateKey, todayLocalDateKey)}
                </span>
                <span className="line-clamp-2 text-sm leading-snug text-zinc-800">
                  {truncateQuote(item.quote, 88)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
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

  const heading =
    selectedDateKey === todayLocalDateKey && !dateFromUrl
      ? "Today's note"
      : format(parseISO(selectedDateKey), "EEEE, MMMM d");

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] lg:items-start lg:gap-8">
      <div className="flex min-w-0 flex-col gap-4">
        <h2 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {heading}
        </h2>
        {selectedContent ? (
          <DailyMotivationDetail
            content={selectedContent}
            usedTodayFallback={showTodayFallback}
          />
        ) : (
          <div className="rounded-3xl border border-dashed border-zinc-300/80 bg-white/70 px-8 py-14 text-center text-sm leading-relaxed text-zinc-600 shadow-sm backdrop-blur-sm">
            {emptyMessage ??
              `No quote is available for ${format(parseISO(selectedDateKey), "MMMM d, yyyy")}.`}
          </div>
        )}
      </div>

      <ArchiveScroller
        items={archiveItems}
        selectedDateKey={selectedContent?.localDateKey ?? selectedDateKey}
        todayLocalDateKey={todayLocalDateKey}
        onSelect={selectDate}
      />
    </div>
  );
}
