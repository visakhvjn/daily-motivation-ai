export type HomeDailyContent = {
  localDateKey: string;
  quote: string;
  story: string;
  imageCompositedUrl: string;
  imageSourceUrl: string;
  unsplashAuthorName: string | null;
  unsplashAuthorUrl: string | null;
};

export type HomeDailyArchiveItem = {
  localDateKey: string;
  quote: string;
  imageCompositedUrl: string;
};

export function firstSearchParam(value: string | string[] | undefined): string | undefined {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0];
  return undefined;
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
