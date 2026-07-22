import DOMPurify, { type Config } from 'isomorphic-dompurify';

/** Allowed tags/attrs for WordPress post HTML rendered in the news page. */
const WP_HTML_CONFIG: Config = {
  USE_PROFILES: { html: true },
  ADD_TAGS: ['iframe', 'figure', 'figcaption', 'picture', 'source', 'video', 'audio', 'track'],
  ADD_ATTR: [
    'target',
    'allow',
    'allowfullscreen',
    'frameborder',
    'scrolling',
    'loading',
    'decoding',
    'srcset',
    'sizes',
  ],
  FORBID_TAGS: ['script', 'style', 'form', 'input', 'button', 'textarea', 'select', 'object', 'embed'],
  ALLOW_DATA_ATTR: true,
};

/**
 * Sanitizes WordPress HTML before Angular TrustHtml / outerHTML binding.
 * Safe for SSR (isomorphic-dompurify).
 */
export function sanitizeWordpressHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, WP_HTML_CONFIG);
}
