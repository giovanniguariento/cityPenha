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
 * Served as a 200 fallback when SSR yields no response so that direct hits /
 * crawlers never receive a 404 for a valid client route (the app hydrates on
 * the client instead).
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

/** Liveness probe without Angular SSR (healthcheck must not render /home). */
app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

/** Canonicalize root to /home (avoids duplicate indexing of / vs /home). */
app.get('/', (_req, res) => {
  res.redirect(301, '/home');
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
        'Allow: /',
        '',
        `Sitemap: ${SITE_URL}/sitemap.xml`,
        '',
      ].join('\n')
    );
});

/** 301 redirect: preserve SEO equity for any previously indexed /news/:slug URLs. */
app.get('/news/:slug', (req, res) => {
  res.redirect(301, `/artigos/geral/${req.params['slug']}`);
});

/** 301 redirect: articles moved from /noticias/ to /artigos/ (magazine rebrand). */
app.get('/noticias/:categorySlug/:slug', (req, res) => {
  res.redirect(301, `/artigos/${req.params['categorySlug']}/${req.params['slug']}`);
});

interface SitemapUrl {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
}

/** Dynamic XML sitemap — fetches all published articles from the API. */
app.get('/sitemap.xml', async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const staticUrls: SitemapUrl[] = [
    { loc: `${SITE_URL}/home`, changefreq: 'daily', priority: '1.0', lastmod: today },
    { loc: `${SITE_URL}/discovery`, changefreq: 'daily', priority: '0.8', lastmod: today },
    { loc: `${SITE_URL}/discovery/topics`, changefreq: 'weekly', priority: '0.6', lastmod: today },
    { loc: `${SITE_URL}/missions`, changefreq: 'weekly', priority: '0.5', lastmod: today },
    { loc: `${SITE_URL}/frequencia`, changefreq: 'weekly', priority: '0.4', lastmod: today },
    { loc: `${SITE_URL}/politica-de-privacidade`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/termos-de-uso`, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/sobre-nos`, changefreq: 'yearly', priority: '0.3' },
  ];

  let articleUrls: SitemapUrl[] = [];

  try {
    const response = await fetch(`${API_URL}/sitemap/posts`, {
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        data?: { posts?: { slug: string; categorySlug: string; lastmod: string }[] };
      };
      const posts = body?.data?.posts ?? [];
      articleUrls = posts.map((p) => ({
        loc: `${SITE_URL}/artigos/${p.categorySlug || 'geral'}/${p.slug}`,
        changefreq: 'weekly',
        priority: '0.9',
        lastmod: p.lastmod || undefined,
      }));
    }
  } catch {
    // If the API is unreachable, serve the sitemap with static URLs only
  }

  const allUrls = [...staticUrls, ...articleUrls];
  const urlEntries = allUrls
    .map((u) => {
      const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
      return `  <url>\n    <loc>${u.loc}</loc>${lastmod}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

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

      // Service worker: precisa ser revalidado sempre e servido a partir da raiz
      // (scope '/') para poder controlar toda a aplicação.
      if (fileName === 'sw.js') {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Service-Worker-Allowed', '/');
        return;
      }

      // Manifest do PWA com o content-type correto.
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
        return writeResponseToNodeResponse(response, res);
      }
      // SSR produced no response (e.g. a navigation error). Fall back to the
      // CSR shell with 200 instead of a 404 so crawlers can still index the
      // route and users get a working (client-rendered) page.
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
