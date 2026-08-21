/*
 * Service worker mínimo do CityPenha.
 * Existe apenas para habilitar a instalação do PWA (o Chrome exige um SW
 * registrado com handler de `fetch`). NÃO faz cache offline: apenas repassa
 * as requisições para a rede.
 */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', () => {
  // Passthrough: sem cache. Não chamamos event.respondWith(), então o browser
  // executa a requisição de rede padrão.
});
