import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

/**
 * CSR shell (browser index.html), read once and cached.
 * Used only as a last-resort fallback when SSR itself fails for a *known* route.
 */
let cachedIndexHtml: string | null = null;
function getIndexHtml(): string {
  if (cachedIndexHtml === null) {
    cachedIndexHtml = readFileSync(join(browserDistFolder, 'index.html'), 'utf-8');
  }
  return cachedIndexHtml;
}

const app = express();
const angularApp = new AngularNodeAppEngine();

function resolveSiteUrl(): string {
  const fromEnv = process.env['SITE_URL']?.trim() || process.env['PUBLIC_URL']?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '');
  }
  const domain = process.env['PUBLIC_DOMAIN']?.trim();
  if (domain) {
    const host = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
    return `https://${host}`;
  }
  return 'https://citypenhadigital.com.br';
}

const API_URL = (process.env['API_URL'] ?? 'https://citypenhadigital.com.br/api').replace(/\/$/, '');
const SITE_URL = resolveSiteUrl();
const ADSENSE_PUBLISHER_ID = 'pub-6632437874949746';

/** Exact public paths that exist in the Angular router. */
const KNOWN_EXACT_PATHS = new Set([
  '/home',
  '/discovery',
  '/discovery/topics',
  '/discovery/search',
  '/frequencia',
  '/missions',
  '/politica-de-privacidade',
  '/termos-de-uso',
  '/sobre-nos',
  '/contato',
  '/login',
  '/login/email',
  '/login/forgot-password',
  '/signup',
  '/favorites',
  '/profile',
  '/profile/edit',
  '/admin',
]);

const KNOWN_PREFIXES = ['/artigos/', '/discovery/topics/', '/favorites/', '/admin/'];

function isKnownRoute(pathname: string): boolean {
  if (KNOWN_EXACT_PATHS.has(pathname)) {
    return true;
  }
  return KNOWN_PREFIXES.some((p) => pathname.startsWith(p));
}

interface CachedPostSlug {
  slug: string;
  categorySlug: string;
}

let slugCache: { at: number; bySlug: Map<string, CachedPostSlug> } | null = null;
const SLUG_CACHE_TTL_MS = 5 * 60 * 1000;

async function getPostSlugIndex(): Promise<Map<string, CachedPostSlug>> {
  if (slugCache && Date.now() - slugCache.at < SLUG_CACHE_TTL_MS) {
    return slugCache.bySlug;
  }

  const bySlug = new Map<string, CachedPostSlug>();
  try {
    const response = await fetch(`${API_URL}/sitemap/slugs`, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        data?: { posts?: { slug: string; categorySlug: string }[] };
      };
      for (const p of body?.data?.posts ?? []) {
        if (p?.slug) {
          bySlug.set(p.slug, {
            slug: p.slug,
            categorySlug: p.categorySlug || 'geral',
          });
        }
      }
    }
  } catch {
    // Keep previous cache on failure so redirects still work briefly.
    if (slugCache) {
      return slugCache.bySlug;
    }
  }

  slugCache = { at: Date.now(), bySlug };
  return bySlug;
}

/** Liveness probe without Angular SSR (healthcheck must not render /home). */
app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

/** Canonicalize root to /home (avoids duplicate indexing of / vs /home). */
app.get('/', (_req, res) => {
  res.redirect(301, '/home');
});

/** AdSense seller authorization file (must be plain text at the domain root). */
app.get('/ads.txt', (_req, res) => {
  res
    .type('text/plain')
    .send(`google.com, ${ADSENSE_PUBLISHER_ID}, DIRECT, f08c47fec0942fa0\n`);
});

/** Dynamic robots.txt so Sitemap URL always matches SITE_URL. */
app.get('/robots.txt', (_req, res) => {
  res
    .type('text/plain')
    .send(
      [
        'User-agent: *',
        'Disallow: /admin',
        'Disallow: /profile',
        'Disallow: /favorites',
        'Disallow: /login',
        'Disallow: /signup',
        'Disallow: /discovery/search',
        'Disallow: /frequencia',
        'Disallow: /missions',
        'Disallow: /blog/wp-json/',
        'Allow: /',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
      ].join('\n')
    );
});

/**
 * Legacy /news/:slug → resolve real category (never force /geral/).
 * Falls back to /geral/ only when the slug index is unavailable.
 */
app.get('/news/:slug', async (req, res) => {
  const slug = req.params['slug'];
  const index = await getPostSlugIndex();
  const entry = index.get(slug);
  const category = entry?.categorySlug || 'geral';
  res.redirect(301, `/artigos/${category}/${slug}`);
});

/** 301 redirect: articles moved from /noticias/ to /artigos/ (magazine rebrand). */
app.get('/noticias/:categorySlug/:slug', (req, res) => {
  res.redirect(301, `/artigos/${req.params['categorySlug']}/${req.params['slug']}`);
});

/**
 * Canonicalize article URLs: wrong category → 301; unknown slug → rewrite to
 * the Angular 404 route so RESPONSE_INIT can emit HTTP 404.
 */
app.get('/artigos/:categorySlug/:slug', async (req, res, next) => {
  const categorySlug = req.params['categorySlug'];
  const slug = req.params['slug'];
  const index = await getPostSlugIndex();

  // Empty index (API down) → let Angular SSR try the API itself.
  if (index.size === 0) {
    next();
    return;
  }

  const entry = index.get(slug);
  if (!entry) {
    // Force the catch-all NotFoundPage by rewriting the URL Angular sees.
    req.url = '/__not-found__';
    next();
    return;
  }

  if (entry.categorySlug !== categorySlug) {
    res.redirect(301, `/artigos/${entry.categorySlug}/${entry.slug}`);
    return;
  }

  next();
});

interface SitemapUrl {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
  video?: {
    title: string;
    description: string;
    thumbnailUrl: string;
    contentUrl?: string;
    embedUrl?: string;
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildVideoSitemapBlock(video: NonNullable<SitemapUrl['video']>): string {
  const lines = [
    '    <video:video>',
    `      <video:thumbnail_loc>${escapeXml(video.thumbnailUrl)}</video:thumbnail_loc>`,
    `      <video:title>${escapeXml(video.title)}</video:title>`,
    `      <video:description>${escapeXml(video.description)}</video:description>`,
  ];

  if (video.contentUrl) {
    lines.push(`      <video:content_loc>${escapeXml(video.contentUrl)}</video:content_loc>`);
  }
  if (video.embedUrl) {
    lines.push(`      <video:player_loc>${escapeXml(video.embedUrl)}</video:player_loc>`);
  }

  lines.push('    </video:video>');
  return lines.join('\n');
}

/** Dynamic XML sitemap — only substantial articles + editorial static pages. */
app.get('/sitemap.xml', async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls: SitemapUrl[] = [
    { loc: `${SITE_URL}/home`, changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: `${SITE_URL}/discovery`, changefreq: 'daily', priority: '0.8', lastmod: today },
    { loc: `${SITE_URL}/discovery/topics`, changefreq: 'weekly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/politica-de-privacidade`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/termos-de-uso`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/sobre-nos`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/contato`, changefreq: 'yearly', priority: '0.3' },
  ];

  let articleUrls: SitemapUrl[] = [];
  let topicUrls: SitemapUrl[] = [];

  try {
    const response = await fetch(`${API_URL}/sitemap/posts`, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        data?: {
          posts?: {
            slug: string;
            categorySlug: string;
            lastmod: string;
            video?: SitemapUrl['video'];
          }[];
        };
      };
      const posts = body?.data?.posts ?? [];
      const categories = new Set<string>();
      articleUrls = posts.map((p) => {
        const cat = p.categorySlug || 'geral';
        categories.add(cat);
        return {
          loc: `${SITE_URL}/artigos/${cat}/${p.slug}`,
          changefreq: 'weekly',
          priority: p.video ? '0.95' : '0.9',
          lastmod: p.lastmod || undefined,
          ...(p.video ? { video: p.video } : {}),
        };
      });
      topicUrls = [...categories].map((slug) => ({
        loc: `${SITE_URL}/discovery/topics/${slug}`,
        changefreq: 'weekly',
        priority: '0.55',
        lastmod: today,
      }));
    }
  } catch {
    // If the API is unreachable, serve the sitemap with static URLs only
  }

  const allUrls = [...staticUrls, ...topicUrls, ...articleUrls];
  const hasVideoEntries = allUrls.some((u) => u.video);
  const urlEntries = allUrls
    .map((u) => {
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
      const videoBlock = u.video ? `\n${buildVideoSitemapBlock(u.video)}` : '';
      return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${lastmod}${videoBlock}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
    })
    .join('\n');

  const xmlnsVideo = hasVideoEntries
    ? '\n        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"'
    : '';
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"${xmlnsVideo}>\n${urlEntries}\n</urlset>`;

  res.type('application/xml').send(xml);
});

/** Hashed Angular bundles (main-XXXX.js) can be cached long-term; plain assets must revalidate. */
function isImmutableBundle(filePath: string): boolean {
  const fileName = filePath.split(/[/\\]/).pop() ?? '';
  return /\.[0-9a-f]{8,}\.(?:js|css|mjs)$/i.test(fileName);
}

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    index: false,
    redirect: false,
    etag: true,
    lastModified: true,
    setHeaders(res, filePath) {
      const fileName = filePath.split(/[/\\]/).pop() ?? '';

      if (fileName === 'sw.js') {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Service-Worker-Allowed', '/');
        return;
      }

      if (fileName === 'manifest.webmanifest') {
        res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        return;
      }

      if (isImmutableBundle(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return;
      }

      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    },
  }),
);

const SSR_TIMEOUT_MS = 10_000;

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  const pathname = (req.path || '/').split('?')[0] || '/';
  const known = isKnownRoute(pathname) || pathname === '/__not-found__';
  let settled = false;

  const timer = setTimeout(() => {
    if (!settled) {
      settled = true;
      next(new Error(`SSR timeout for ${req.url}`));
    }
  }, SSR_TIMEOUT_MS);

  angularApp
    .handle(req)
    .then((response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (response) {
        // Unknown paths that somehow still returned 200 → force 404.
        if (!known && response.status === 200) {
          const headers = new Headers(response.headers);
          const forced = new Response(response.body, {
            status: 404,
            statusText: 'Not Found',
            headers,
          });
          return writeResponseToNodeResponse(forced, res);
        }
        return writeResponseToNodeResponse(response, res);
      }

      // SSR produced no response.
      if (!known) {
        res.status(404).type('text/html').send(getIndexHtml());
        return;
      }
      // Known route but SSR failed — CSR shell so the app can still boot.
      res.status(200).type('text/html').send(getIndexHtml());
      return;
    })
    .catch((err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      next(err);
    });
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = Number(process.env['PORT'] || 4000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Node Express server listening on http://0.0.0.0:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
