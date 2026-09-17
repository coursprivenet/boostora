// Deliberately its own variable, not CORS_ORIGIN — that one governs the API's CORS
// policy and can legitimately differ (or be a list) in some setups; conflating the two
// meant every email link silently pointed at whatever CORS_ORIGIN happened to be set to
// in that environment (localhost, in production, until this was caught).
const APP_URL = process.env.APP_URL ?? "https://boostora-web-one.vercel.app";

/** One shared transactional layout — plain, inline-styled (safe across mail clients), no build step. */
export function renderNotificationEmail(title: string, body: string | null, link: string | null) {
  const ctaHtml = link
    ? `<a href="${APP_URL}${link}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#12141a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Voir sur Wassago</a>`
    : "";

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#12141a;">
      <p style="font-size:18px;font-weight:700;margin:0 0 24px;">Wassago</p>
      <h1 style="font-size:16px;font-weight:600;margin:0 0 12px;">${title}</h1>
      ${body ? `<p style="font-size:14px;line-height:1.6;color:#565c74;margin:0;">${body}</p>` : ""}
      ${ctaHtml}
    </div>
  `;
}
