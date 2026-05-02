import { getAppTimezone } from "@/lib/env";
import { getTodayLocalDateKey } from "@/lib/daily-date";
import { prisma } from "@/lib/prisma";

const LOCAL_DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
}

export type HomeDailyContent = {
  localDateKey: string;
  quote: string;
  story: string;
  imageCompositedUrl: string;
  imageSourceUrl: string;
  unsplashAuthorName: string | null;
  unsplashAuthorUrl: string | null;
};

export type ResolvedHomeDailyContent = {
  content: HomeDailyContent | null;
  targetDateKey: string;
  isTodayRequest: boolean;
  usedTodayFallback: boolean;
  isDateParamValid: boolean;
};

const selectFields = {
  localDateKey: true,
  quote: true,
  story: true,
  imageCompositedUrl: true,
  imageSourceUrl: true,
  unsplashAuthorName: true,
  unsplashAuthorUrl: true,
} as const;

export async function resolveHomeDailyContent(
  sp: Record<string, string | string[] | undefined>,
): Promise<ResolvedHomeDailyContent> {
  const timeZone = getAppTimezone();
  const todayLocalDateKey = getTodayLocalDateKey(timeZone);
  const requestedDate = firstSearchParam(sp.date);
  const hasDateParam = requestedDate !== undefined;
  const isDateParamValid = !hasDateParam || LOCAL_DATE_KEY_REGEX.test(requestedDate);
  const targetDateKey = isDateParamValid && requestedDate ? requestedDate : todayLocalDateKey;
  const isTodayRequest = targetDateKey === todayLocalDateKey;

  let content: HomeDailyContent | null = null;
  let usedTodayFallback = false;

  if (process.env.DATABASE_URL && isDateParamValid) {
    content = await prisma.dailyContent.findUnique({
      where: { localDateKey: targetDateKey },
      select: selectFields,
    });

    if (!content && isTodayRequest) {
      content = await prisma.dailyContent.findFirst({
        where: { localDateKey: { lt: todayLocalDateKey } },
        orderBy: { localDateKey: "desc" },
        select: selectFields,
      });
      usedTodayFallback = Boolean(content);
    }
  }

  return {
    content,
    targetDateKey,
    isTodayRequest,
    usedTodayFallback,
    isDateParamValid,
  };
}

export function buildDateHref(dateKey: string, sp: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  params.set("date", dateKey);

  const subscribed = firstSearchParam(sp.subscribed);
  if (subscribed) params.set("subscribed", subscribed);

  const error = firstSearchParam(sp.error);
  if (error) params.set("error", error);

  return `/?${params.toString()}`;
}
