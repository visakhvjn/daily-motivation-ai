import type { HomeDailyContent } from "@/lib/home-daily-types";

export type DailyQuoteJson = {
  title: string;
  story: string;
};

export function toDailyQuoteJson(content: HomeDailyContent): DailyQuoteJson {
  return {
    title: content.quote,
    story: content.story,
  };
}
