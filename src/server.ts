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

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/** Liveness probe without Angular SSR (healthcheck must not render /home). */
app.get('/health', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
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
