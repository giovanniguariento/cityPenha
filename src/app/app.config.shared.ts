import { ApplicationConfig, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authApiInterceptor } from './core/interceptors/auth-api.interceptor';
import { StoreData } from './shared/store/store';

/** Providers safe for both browser bootstrap and SSR. */
export const sharedAppConfig: ApplicationConfig = {
  providers: [
    StoreData,
    provideZoneChangeDetection({ eventCoalescing: true }),
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { enterAnimationDuration: '200ms', exitAnimationDuration: '150ms' },
    },
    provideHttpClient(withFetch(), withInterceptors([authApiInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
  ],
};
