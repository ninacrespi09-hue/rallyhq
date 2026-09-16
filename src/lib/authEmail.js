import { getAppUrl } from "./appUrl";

/**
 * Send transactional auth emails via Resend when configured.
 * Without RESEND_API_KEY, logs the link (dev) so flows still work locally.
 */
export async function sendAuthEmail({ to, subject, html, text }) {
  // Read the Resend key and "from" address from the server environment (Render).
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "RallyHQ <onboarding@resend.dev>";
  const appUrl = getAppUrl();

  // Log config shape only — never log the raw API key.
  console.info("[auth-email] prepare send", {
    to,
    from,
    subject,
    appUrl,
    hasResendKey: Boolean(apiKey),
    keyPrefix: apiKey ? `${apiKey.slice(0, 6)}…` : null,
  });

  // No API key → we cannot talk to Resend. Locally we pretend it worked and log the link.
  if (!apiKey) {
    console.warn(`[auth-email] RESEND_API_KEY not set — email not sent to ${to}`);
    console.warn(`[auth-email] ${subject}\n${text || html}`);
    return { ok: true, mocked: true };
  }

  let res;
  try {
    res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [to], subject, html, text }),
    });
  } catch (err) {
    console.error("[auth-email] Resend network error:", err?.message || err);
    return { ok: false, error: "Failed to reach the email provider. Try again in a moment." };
  }

  const bodyText = await res.text();
  let bodyJson = null;
  try {
    bodyJson = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    bodyJson = null;
  }

  if (!res.ok) {
    console.error("[auth-email] Resend rejected send", {
      status: res.status,
      to,
      from,
      body: bodyText,
    });
    return {
      ok: false,
      error:
        "Failed to send email. Check RESEND_API_KEY, EMAIL_FROM, and that rallycentralhq.com is verified in Resend.",
    };
  }

  console.info("[auth-email] Resend accepted send", {
    status: res.status,
    to,
    from,
    id: bodyJson?.id || null,
  });

  return { ok: true, id: bodyJson?.id || null };
}

export async function sendVerificationEmail(email, rawToken) {
  // Build the clickable verify link for this app's public URL (must be the custom domain in prod).
  const appUrl = getAppUrl();
  const link = `${appUrl}/verify-email?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(email)}`;
  const subject = "Verify your RallyHQ email";
  const text = `Welcome to RallyHQ!\n\nYour verification code is: ${rawToken}\n\nOr open this link:\n${link}\n\nThis code expires in 24 hours.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h1 style="font-size:20px;margin-bottom:8px">Verify your email</h1>
      <p style="color:#475569;line-height:1.5">Thanks for joining RallyHQ. Enter this code on the verify page, or tap the button below.</p>
      <p style="margin:24px 0;text-align:center;font-size:32px;font-weight:700;letter-spacing:0.2em;color:#0f172a">${rawToken}</p>
      <p style="margin:24px 0;text-align:center">
        <a href="${link}" style="background:#3b82f6;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Verify email</a>
      </p>
      <p style="font-size:13px;color:#64748b">Or paste this link into your browser:<br>${link}</p>
      <p style="font-size:13px;color:#64748b">This code expires in 24 hours.</p>
    </div>`;
  console.info("[auth-email] verification link host", {
    email,
    appUrl,
    linkHost: (() => {
      try {
        return new URL(link).host;
      } catch {
        return "invalid-url";
      }
    })(),
  });
  const result = await sendAuthEmail({ to: email, subject, html, text });
  return { ...result, link, code: rawToken };
}

export async function sendPasswordResetEmail(email, rawToken) {
  const link = `${getAppUrl()}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const subject = "Reset your RallyHQ password";
  const text = `Reset your RallyHQ password by opening this link:\n${link}\n\nIf you didn't ask for this, you can ignore this email. The link expires in 1 hour.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h1 style="font-size:20px;margin-bottom:8px">Reset your password</h1>
      <p style="color:#475569;line-height:1.5">We received a request to reset the password for your RallyHQ account.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#3b82f6;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Choose a new password</a>
      </p>
      <p style="font-size:13px;color:#64748b">Or paste this link into your browser:<br>${link}</p>
      <p style="font-size:13px;color:#64748b">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
    </div>`;
  const result = await sendAuthEmail({ to: email, subject, html, text });
  return { ...result, link };
}
