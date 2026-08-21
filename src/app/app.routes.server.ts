import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'home', renderMode: RenderMode.Server },
  { path: 'discovery', renderMode: RenderMode.Server },
  { path: 'discovery/topics', renderMode: RenderMode.Server },
  { path: 'discovery/topics/:slug', renderMode: RenderMode.Server },
  { path: 'discovery/search', renderMode: RenderMode.Server },
  { path: 'artigos/:categorySlug/:slug', renderMode: RenderMode.Server },
  { path: 'frequencia', renderMode: RenderMode.Server },
  { path: 'missions', renderMode: RenderMode.Server },
  { path: 'politica-de-privacidade', renderMode: RenderMode.Server },
  { path: 'termos-de-uso', renderMode: RenderMode.Server },
  { path: 'sobre-nos', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
