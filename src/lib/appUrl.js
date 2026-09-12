/** True if the URL/host is a local machine address (unsafe for production redirects). */
function isLocalHost(value) {
  return /localhost|127\.0\.0\.1/i.test(value || "");
}

/** First value from a possibly comma-separated forwarded header. */
function firstHeader(value) {
  return (value || "").split(",")[0].trim();
}

/**
 * Public base URL for email links, OAuth callbacks, and logout redirects.
 * Prefer APP_URL, then the browser's Host / X-Forwarded-* headers, and never
 * fall back to Render's internal localhost URL when a real host is available.
 */
export function getAppUrl(request) {
  const envUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(
    /\/$/,
    ""
  );
  // Production should use the configured public domain (e.g. https://rallycentralhq.com).
  if (envUrl && !isLocalHost(envUrl)) return envUrl;

  if (request?.headers) {
    const host = firstHeader(
      request.headers.get("x-forwarded-host") || request.headers.get("host")
    );
    if (host && !isLocalHost(host)) {
      const proto =
        firstHeader(request.headers.get("x-forwarded-proto")) ||
        (host.includes("localhost") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }

  // Local development only — keep APP_URL=http://localhost:3000 if set.
  if (envUrl) return envUrl;

  const render = (process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
  if (render && !isLocalHost(render)) return render;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
