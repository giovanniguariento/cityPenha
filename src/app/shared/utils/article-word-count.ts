import { plainTextFromHtml } from './decode-html-entities';

/**
 * Minimum body length for a page to count as publisher content.
 *
 * Google AdSense forbids Google-served ads on screens with no or low-value
 * content, so anything below this threshold renders without ad slots.
 */
export const MIN_ARTICLE_WORDS_FOR_ADS = 300;

/** Body text without markup or entities. Safe for SSR (no DOM). */
export function articlePlainText(html: string | null | undefined): string {
  if (!html) return '';
  const withoutMedia = html
    .replace(/<(script|style|iframe|video|audio)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
  return plainTextFromHtml(withoutMedia);
}

export function countWords(text: string): number {
  if (!text) return 0;
  const words = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu);
  return words ? words.length : 0;
}

export function articleWordCount(html: string | null | undefined): number {
  return countWords(articlePlainText(html));
}

export function hasEnoughContentForAds(html: string | null | undefined): boolean {
  return articleWordCount(html) >= MIN_ARTICLE_WORDS_FOR_ADS;
}
