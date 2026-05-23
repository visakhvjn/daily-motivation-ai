import { getAppTimezone } from "@/lib/env";
import { getTodayLocalDateKey } from "@/lib/daily-date";
import {
  type HomeDailyArchiveItem,
  type HomeDailyContent,
  firstSearchParam,
} from "@/lib/home-daily-types";
import { prisma } from "@/lib/prisma";

export type { HomeDailyArchiveItem, HomeDailyContent } from "@/lib/home-daily-types";
export { buildDateHref, firstSearchParam } from "@/lib/home-daily-types";

const LOCAL_DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

export async function fetchAllHomeDailyContent(): Promise<{
  items: HomeDailyArchiveItem[];
  byDate: Record<string, HomeDailyContent>;
}> {
  if (!process.env.DATABASE_URL) {
    return { items: [], byDate: {} };
  }

  const rows = await prisma.dailyContent.findMany({
    orderBy: { localDateKey: "desc" },
    select: selectFields,
  });

  const byDate: Record<string, HomeDailyContent> = {};
  const items: HomeDailyArchiveItem[] = rows.map((row) => {
    byDate[row.localDateKey] = row;
    return {
      localDateKey: row.localDateKey,
      quote: row.quote,
      imageCompositedUrl: row.imageCompositedUrl,
    };
  });

  return { items, byDate };
}

