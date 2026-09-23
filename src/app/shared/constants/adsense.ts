/** Google AdSense publisher client ID (ca-pub-…). */
export const ADSENSE_CLIENT = 'ca-pub-6632437874949746';

/**
 * Optional display ad unit slot. Leave empty until a unit is created in the
 * AdSense panel — the loader still injects the script on eligible pages so
 * Auto Ads (with URL exclusions) can run only where content exists.
 */
export const ADSENSE_ARTICLE_SLOT = '';

/** Paths where AdSense may load (content / discovery surfaces only). */
export const ADSENSE_ALLOWED_PATH_PREFIXES = [
  '/home',
  '/discovery',
  '/artigos/',
] as const;

/** Paths that must never load AdSense (auth, app chrome, empty shells). */
export const ADSENSE_BLOCKED_PATH_PREFIXES = [
  '/login',
  '/signup',
  '/profile',
  '/favorites',
  '/admin',
  '/frequencia',
  '/missions',
  '/discovery/search',
] as const;
