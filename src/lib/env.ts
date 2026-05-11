export function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} is not set`);
  }
  return v;
}

export function getAppTimezone() {
  return process.env.APP_TIMEZONE ?? "America/New_York";
}

/**
 * Public site origin for canonical URLs and Open Graph.
 * On Vercel, prefer APP_URL; otherwise VERCEL_URL so previews are not wired to localhost.
 */
export function getAppUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
