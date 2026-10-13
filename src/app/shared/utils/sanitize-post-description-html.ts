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
    'video',
    'iframe',
  ],
  ALLOWED_ATTR: [
    'href',
    'rel',
    'target',
    'src',
    'alt',
    'loading',
    'class',
    'controls',
    'poster',
    'preload',
    'width',
    'height',
    'title',
    'allow',
    'allowfullscreen',
    'referrerpolicy',
    'frameborder',
  ],
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

const EMBED_HOSTS = new Set([
  'www.youtube.com',
  'youtube.com',
  'www.youtube-nocookie.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
]);

function isSafeEmbedSrc(src: string): boolean {
  if (!src.startsWith('https://')) return false;
  try {
    return EMBED_HOSTS.has(new URL(src).hostname.toLowerCase());
  } catch {
    return false;
  }
}

/**
 * Sanitizes TipTap article HTML before POST /post/create (type=article).
 */
export function sanitizePostArticleHtml(html: string): string {
  if (!html) return '';
  const clean = DOMPurify.sanitize(html, ARTICLE_HTML_CONFIG);
  // Align with backend: only YouTube/Vimeo iframe hosts.
  return clean.replace(/<iframe\b[^>]*(?:\/>|>[\s\S]*?<\/iframe>)/gi, (tag) => {
    const src = tag.match(/\ssrc=["']([^"']+)["']/i)?.[1]?.trim() ?? '';
    return src && isSafeEmbedSrc(src) ? tag : '';
  });
}

/** True when TipTap/HTML has no meaningful plain text and no media. */
export function isEmptyPostHtml(html: string): boolean {
  if (!html?.trim()) return true;
  if (/<(img|video|iframe)\b[^>]*\ssrc=["'][^"']+["']/i.test(html)) {
    return false;
  }
  const plain = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return !plain;
}

export function plainTextFromPostHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
