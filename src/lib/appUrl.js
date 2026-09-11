/** Public base URL for email links and OAuth callbacks. */
export function getAppUrl() {
  const fromEnv =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.RENDER_EXTERNAL_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  return "http://localhost:3000";
}
