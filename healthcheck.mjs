/**
 * Verifica se o servidor SSR está de pé: rota /home, HTML Angular renderizado.
 */
const port = Number(process.env['PORT'] || 4000);
const url = `http://127.0.0.1:${port}/home`;
const timeoutMs = 8000;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timer);

  if (!response.ok) {
    process.exit(1);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    process.exit(1);
  }

  const html = await response.text();
  const hasAppShell = html.includes('<app-root');
  const hasHomeRender =
    html.includes('app-home') ||
    html.includes('app-home-skeleton') ||
    html.includes('home-state') ||
    html.includes('app-nav');

  process.exit(hasAppShell && hasHomeRender ? 0 : 1);
} catch {
  clearTimeout(timer);
  process.exit(1);
}
