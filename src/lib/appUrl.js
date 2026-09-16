/** Live custom domain — used for email links + redirects in production. */
export const CANONICAL_APP_URL = "https://rallycentralhq.com";

/** True if the URL/host is a local machine address (unsafe for production redirects). */
function isLocalHost(value) {
  return /localhost|127\.0\.0\.1/i.test(value || "");
}

/** Old Render hostname — still works, but cookies/links should use the custom domain. */
function isLegacyRenderHost(value) {
  return /onrender\.com/i.test(value || "");
}

/** First value from a possibly comma-separated forwarded header. */
function firstHeader(value) {
  return (value || "").split(",")[0].trim();
}

/**
 * Public base URL for email links, OAuth callbacks, and logout redirects.
 * Prefer APP_URL when it is the real public domain. In production, never emit
 * localhost or the old *.onrender.com host for verification emails — that broke
 * signup after the logout redirect fix when getAppUrl() was called without a request.
 */
export function getAppUrl(request) {
  const envUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").replace(
    /\/$/,
    ""
  );

  // Explicit custom domain wins.
  if (envUrl && /rallycentralhq\.com/i.test(envUrl)) return envUrl;

  // Production: avoid localhost + prefer custom domain over legacy onrender URL.
  if (process.env.NODE_ENV === "production") {
    if (envUrl && !isLocalHost(envUrl) && !isLegacyRenderHost(envUrl)) return envUrl;

    if (request?.headers) {
      const host = firstHeader(
        request.headers.get("x-forwarded-host") || request.headers.get("host")
      );
      if (host && !isLocalHost(host)) {
        if (/rallycentralhq\.com/i.test(host) || !isLegacyRenderHost(host)) {
          const proto =
            firstHeader(request.headers.get("x-forwarded-proto")) || "https";
          return `${proto}://${host}`.replace(/\/$/, "");
        }
      }
    }

    return CANONICAL_APP_URL;
  }

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

  if (envUrl) return envUrl;

  const render = (process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
  if (render && !isLocalHost(render)) return render;

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}
