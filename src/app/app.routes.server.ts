import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'home', renderMode: RenderMode.Server },
  { path: 'discovery', renderMode: RenderMode.Server },
  { path: 'discovery/topics', renderMode: RenderMode.Server },
  { path: 'noticias/:categorySlug/:slug', renderMode: RenderMode.Server },
  { path: 'frequencia', renderMode: RenderMode.Server },
  { path: 'missions', renderMode: RenderMode.Server },
  { path: '**', renderMode: RenderMode.Client },
];
