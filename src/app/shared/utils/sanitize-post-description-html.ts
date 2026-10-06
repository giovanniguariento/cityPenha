import DOMPurify, { type Config } from 'isomorphic-dompurify';

/** Strict allowlist for short-post description (aligned with backend sanitize). */
const DESCRIPTION_HTML_CONFIG: Config = {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'a'],
  ALLOWED_ATTR: ['href', 'rel', 'target'],
  ALLOW_DATA_ATTR: false,
};

/** Article body allowlist (aligned with backend sanitizePostArticleHtml). */
const ARTICLE_HTML_CONFIG: Config = {
  ALLOWED_TAGS: [
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ul',
    'ol',
    'li',
    'a',
    'h2',
    'h3',
    'blockquote',
    'hr',
    'img',
    'figure',
  ],
  ALLOWED_ATTR: ['href', 'rel', 'target', 'src', 'alt', 'loading', 'class'],
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitizes description HTML before POST /post/create (video caption).
 * Does not allow iframe/video (unlike full WordPress content sanitizer).
 */
export function sanitizePostDescriptionHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, DESCRIPTION_HTML_CONFIG);
}

/**
 * Sanitizes TipTap article HTML before POST /post/create (type=article).
 */
export function sanitizePostArticleHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, ARTICLE_HTML_CONFIG);
}

/** True when TipTap/HTML has no meaningful plain text. */
export function isEmptyPostHtml(html: string): boolean {
  if (!html?.trim()) return true;
  const plain = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return !plain;
}

export function plainTextFromPostHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
