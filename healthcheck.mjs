/**
 * Verifica se o processo HTTP do frontend está de pé (sem disparar SSR).
 */
const port = Number(process.env['PORT'] || 4000);
const url = `http://127.0.0.1:${port}/health`;
const timeoutMs = 5000;

const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);

try {
  const response = await fetch(url, { signal: controller.signal });
  clearTimeout(timer);

  if (!response.ok) {
    process.exit(1);
  }

  const body = (await response.text()).trim();
  process.exit(body === 'ok' ? 0 : 1);
} catch {
  clearTimeout(timer);
  process.exit(1);
}
