/** Removes HTML tags and collapses whitespace. Safe for SSR (no DOM). */
export function stripHtml(text: string): string {
  if (!text) return '';
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Plain text for meta tags, OG descriptions, and share snippets.
 * Strips HTML tags then decodes entities (e.g. WordPress `resume`).
 */
export function plainTextFromHtml(html: string): string {
  return decodeHtmlEntities(stripHtml(html));
}

/**
 * Decodes common HTML entities in plain text (e.g. from WordPress/API).
 * Safe for SSR (no DOM). Does not interpret HTML tags — only entities.
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  let out = text
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  const named: Record<string, string> = {
    '&nbsp;': '\u00A0',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&apos;': "'",
    '&ldquo;': '\u201C',
    '&rdquo;': '\u201D',
    '&lsquo;': '\u2018',
    '&rsquo;': '\u2019',
    '&hellip;': '\u2026',
    '&mdash;': '\u2014',
    '&ndash;': '\u2013',
  };
  for (const [entity, ch] of Object.entries(named)) {
    out = out.split(entity).join(ch);
  }
  return out;
}
