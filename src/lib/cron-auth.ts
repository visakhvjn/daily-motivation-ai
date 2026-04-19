import { requireEnv } from "@/lib/env";

export function assertCronAuthorized(request: Request) {
  const secret = requireEnv("CRON_SECRET");
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return;

  const url = new URL(request.url);
  const q = url.searchParams.get("secret");
  if (q === secret) return;

  throw new Error("UNAUTHORIZED");
}
