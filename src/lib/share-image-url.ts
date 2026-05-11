import { getAppUrl } from "@/lib/env";

/** Same-origin URL for OG/Twitter cards — proxies the stored image so crawlers reliably fetch it. */
export function getShareImageUrl(localDateKey: string): string {
  const base = getAppUrl();
  return new URL(`/share/${localDateKey}/image`, `${base}/`).href;
}
