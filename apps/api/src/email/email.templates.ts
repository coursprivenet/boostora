const APP_URL = process.env.CORS_ORIGIN ?? "https://boostora-web-one.vercel.app";

/** One shared transactional layout — plain, inline-styled (safe across mail clients), no build step. */
export function renderNotificationEmail(title: string, body: string | null, link: string | null) {
  const ctaHtml = link
    ? `<a href="${APP_URL}${link}" style="display:inline-block;margin-top:20px;padding:10px 20px;background:#12141a;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">Voir sur Boostora</a>`
    : "";

  return `
    <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#12141a;">
      <p style="font-size:18px;font-weight:700;margin:0 0 24px;">Boostora</p>
      <h1 style="font-size:16px;font-weight:600;margin:0 0 12px;">${title}</h1>
      ${body ? `<p style="font-size:14px;line-height:1.6;color:#565c74;margin:0;">${body}</p>` : ""}
      ${ctaHtml}
    </div>
  `;
}
