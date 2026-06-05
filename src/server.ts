import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const API_URL = process.env['API_URL'] ?? 'https://api.citypenha.com.br';
const SITE_URL = 'https://citypenha.com.br';

/** Liveness probe without Angular SSR (healthcheck must not render /home). */
app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

/** 301 redirect: preserve SEO equity for any previously indexed /news/:slug URLs. */
app.get('/news/:slug', (req, res) => {
  res.redirect(301, `/noticias/geral/${req.params['slug']}`);
});

/** Dynamic XML sitemap — fetches article slugs from the API. */
app.get('/sitemap.xml', async (_req, res) => {
  const staticUrls = [
    { loc: `${SITE_URL}/home`, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/discovery`, changefreq: 'daily', priority: '0.8' },
    { loc: `${SITE_URL}/missions`, changefreq: 'weekly', priority: '0.5' },
  ];

  let articleUrls: { loc: string; changefreq: string; priority: string }[] = [];

  try {
    const response = await fetch(`${API_URL}/home`, { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const body = await response.json() as { data?: { carousel?: { slug: string; categorySlug: string }[] } };
      const posts = body?.data?.carousel ?? [];
      articleUrls = posts.map((p) => ({
        loc: `${SITE_URL}/noticias/${p.categorySlug}/${p.slug}`,
        changefreq: 'weekly',
        priority: '0.9',
      }));
    }
  } catch {
    // If the API is unreachable, serve the sitemap with static URLs only
  }

  const allUrls = [...staticUrls, ...articleUrls];
  const urlEntries = allUrls
    .map(
      (u) =>
        `  <url>\n    <loc>${u.loc}</loc>\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries}\n</urlset>`;

  res.type('application/xml').send(xml);
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
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
      return response ? writeResponseToNodeResponse(response, res) : next();
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
