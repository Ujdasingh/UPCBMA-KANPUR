/**
 * Transactional email — thin wrapper over Resend's HTTP API.
 *
 * Why Resend: it pairs well with Vercel/Next.js, has a generous free tier,
 * and the API is a single fetch — no SDK to install. We keep the surface
 * intentionally small (just `sendEmail`) and never throw inside server
 * actions; an email failure should not break a user-visible flow.
 *
 * Required env vars:
 *   RESEND_API_KEY          — your API key
 *   EMAIL_FROM              — verified sender, e.g. "UPCBMA <noreply@upcbma.com>"
 *   EMAIL_REPLY_TO          — optional; falls back to EMAIL_FROM
 *
 * If RESEND_API_KEY is missing we log to stdout and return ok=false. That
 * keeps the dev/preview environments quiet without crashing.
 */

export type EmailRecipient = string | string[];

export type SendEmailInput = {
  to: EmailRecipient;
  subject: string;
  /** Plain-text body. Always include this — some inboxes prefer it. */
  text: string;
  /** Optional HTML — pretty version. Wrapped in our shared shell when present. */
  html?: string;
  /** CC and BCC are useful for "loop in chapter admin while replying to user". */
  cc?: EmailRecipient;
  bcc?: EmailRecipient;
  /** Override Reply-To — e.g. set to the submitter so the committee can hit reply. */
  replyTo?: string;
  /** Tag for analytics in Resend dashboard. */
  tag?: string;
};

export type SendEmailResult = {
  ok: boolean;
  id?: string;
  error?: string;
};

const FROM = process.env.EMAIL_FROM || "UPCBMA <noreply@upcbma.com>";
const REPLY_TO_DEFAULT = process.env.EMAIL_REPLY_TO || FROM;

/**
 * Send a single transactional email. Catches every error — caller never
 * needs a try/catch.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Dev / preview: log enough that you can copy-paste and verify the
    // notification fired without actually sending.
    console.log(
      "[email:dry-run]",
      JSON.stringify(
        {
          to: input.to,
          subject: input.subject,
          tag: input.tag,
          replyTo: input.replyTo ?? REPLY_TO_DEFAULT,
        },
        null,
        2,
      ),
    );
    return { ok: false, error: "no_api_key" };
  }

  const body = {
    from: FROM,
    to: arr(input.to),
    cc: input.cc ? arr(input.cc) : undefined,
    bcc: input.bcc ? arr(input.bcc) : undefined,
    reply_to: input.replyTo ?? REPLY_TO_DEFAULT,
    subject: input.subject,
    text: input.text,
    html: input.html ? wrapHtml(input.html) : undefined,
    tags: input.tag ? [{ name: "kind", value: input.tag }] : undefined,
  };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.error("[email:resend:error]", res.status, errText);
      return { ok: false, error: `${res.status} ${errText.slice(0, 200)}` };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, id: data.id };
  } catch (err: any) {
    console.error("[email:resend:throw]", err?.message ?? err);
    return { ok: false, error: err?.message ?? "send_failed" };
  }
}

function arr(v: EmailRecipient): string[] {
  return Array.isArray(v) ? v.filter(Boolean) : v ? [v] : [];
}

/**
 * Wrap an HTML body in a minimal, accessible shell so every notification
 * looks like it came from the same association — not random raw HTML.
 */
function wrapHtml(inner: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>UPCBMA</title></head>
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:4px">
    <tr>
      <td style="padding:20px 24px;border-bottom:1px solid #e2e8f0">
        <div style="font-size:10px;font-weight:600;letter-spacing:0.18em;color:#64748b;text-transform:uppercase">UPCBMA</div>
        <div style="font-size:16px;font-weight:700;color:#0f172a;margin-top:4px">Uttar Pradesh Corrugated Box Manufacturers&rsquo; Association</div>
      </td>
    </tr>
    <tr>
      <td style="padding:24px;font-size:14px;line-height:1.6;color:#0f172a">
        ${inner}
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b">
        This is an automated notification from upcbma.com. If you weren&rsquo;t expecting it, you can ignore this email.
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Helper: render simple key/value rows for HTML emails. Used by every
 * notification template so they look consistent.
 */
export function renderRows(rows: Array<[string, string | null | undefined]>): string {
  const cells = rows
    .filter(([, v]) => !!v)
    .map(
      ([k, v]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:0.08em;font-weight:600;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td>
        <td style="padding:6px 0;color:#0f172a;font-size:14px">${escapeHtml(String(v))}</td>
      </tr>`,
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0">${cells}</table>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
