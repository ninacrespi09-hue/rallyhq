import { getAppUrl } from "./appUrl";

/**
 * Send transactional auth emails via Resend when configured.
 * Without RESEND_API_KEY, logs the link (dev) so flows still work locally.
 */
export async function sendAuthEmail({ to, subject, html, text }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "RallyHQ <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn(`[auth-email] RESEND_API_KEY not set — email not sent to ${to}`);
    console.warn(`[auth-email] ${subject}\n${text || html}`);
    return { ok: true, mocked: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error("[auth-email] Resend error:", res.status, body);
    return { ok: false, error: "Failed to send email." };
  }

  return { ok: true };
}

export async function sendVerificationEmail(email, rawToken) {
  const link = `${getAppUrl()}/verify-email?token=${encodeURIComponent(rawToken)}`;
  const subject = "Verify your RallyHQ email";
  const text = `Welcome to RallyHQ!\n\nConfirm your email by opening this link:\n${link}\n\nThis link expires in 24 hours.`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h1 style="font-size:20px;margin-bottom:8px">Verify your email</h1>
      <p style="color:#475569;line-height:1.5">Thanks for joining RallyHQ. Confirm this email belongs to you so you can sign in securely.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#3b82f6;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;font-weight:600">Verify email</a>
      </p>
      <p style="font-size:13px;color:#64748b">Or paste this link into your browser:<br>${link}</p>
      <p style="font-size:13px;color:#64748b">This link expires in 24 hours.</p>
    </div>`;
  const result = await sendAuthEmail({ to: email, subject, html, text });
  return { ...result, link };
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
