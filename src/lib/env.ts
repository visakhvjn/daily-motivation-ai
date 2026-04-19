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

export function getAppUrl() {
  return process.env.APP_URL ?? "http://localhost:3000";
}
