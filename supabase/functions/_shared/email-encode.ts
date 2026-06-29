// Shared email helpers: sanitize subject to ASCII (prevents Q-encoded
// =?utf-8?Q?...?= word longer than 75 chars that Gmail/Outlook fail to
// decode) and derive a plain-text body from HTML (prevents denomailer
// "content: auto" from emitting raw multipart MIME as the visible body).

export const sanitizeEmailSubject = (s: string): string =>
  (s || "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}]/gu, "")
    .replace(/[áàâãä]/gi, "a")
    .replace(/[éèêë]/gi, "e")
    .replace(/[íìîï]/gi, "i")
    .replace(/[óòôõö]/gi, "o")
    .replace(/[úùûü]/gi, "u")
    .replace(/[ç]/gi, "c")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const htmlToPlainText = (h: string): string =>
  (h || "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
