import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { HttpRequest, provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  provideClientHydration,
  withEventReplay,
  withHttpTransferCacheOptions,
} from '@angular/platform-browser';
import { authApiInterceptor } from './core/interceptors/auth-api.interceptor';
import { ssrTimeoutInterceptor } from './core/interceptors/ssr-timeout.interceptor';

/**
 * Public, cacheable content endpoints. Serializing these lets the browser
 * resolve them synchronously during hydration, so the SSR article body is
 * claimed instead of being replaced by the loading skeleton.
 *
 * Requests carrying `Authorization` bypass the transfer cache (Angular default),
 * so a signed-in reader still fetches their own like/save state.
 */
const TRANSFERABLE_CONTENT_PATHS = ['/home', '/post/', '/discovery'];

function isTransferableContentRequest(req: HttpRequest<unknown>): boolean {
  if (req.method !== 'GET') {
    return false;
  }
  const path = req.url.split('?')[0] ?? '';
  return TRANSFERABLE_CONTENT_PATHS.some((p) => path.includes(p));
}

/** Providers safe for both browser bootstrap and SSR. */
export const sharedAppConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { enterAnimationDuration: '200ms', exitAnimationDuration: '150ms' },
    },
    provideHttpClient(
      withFetch(),
      withInterceptors([ssrTimeoutInterceptor, authApiInterceptor]),
    ),
    // Must be shared: when this lives only in the browser config the server
    // renders without hydration annotations, the client throws the SSR DOM away
    // and re-fetches every article.
    provideClientHydration(
      withEventReplay(),
      withHttpTransferCacheOptions({
        includePostRequests: false,
        includeRequestsWithAuthHeaders: false,
        filter: isTransferableContentRequest,
      }),
    ),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
