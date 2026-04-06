import { ApplicationConfig, importProvidersFrom, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { InMemoryScrollingOptions, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';

import { routes } from './app.routes';
import { IdlePreloadStrategy } from './core/routing/idle-preload.strategy';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { StoreData } from './shared/store/store';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { authApiInterceptor } from './core/interceptors/auth-api.interceptor';
import localePt from '@angular/common/locales/pt';
import { registerLocaleData } from '@angular/common';
import { initializeApp, provideFirebaseApp, FirebaseOptions } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';

// Registra os dados da língua portuguesa
registerLocaleData(localePt);

const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
};

const inMemoryScrollingFeature = withInMemoryScrolling(scrollConfig);

const firebaseConfig: any = {
  projectId: 'citypenha',
  appId: '1:771190117440:web:df15e21d9dd4914bf2fba5',
  storageBucket: 'citypenha.firebasestorage.app',
  apiKey: 'AIzaSyD0LfWjCrt5v1dDGGQMS8Qpe8tcUQPfMTs',
  authDomain: 'citypenha.firebaseapp.com',
  messagingSenderId: '771190117440',
  projectNumber: '771190117440',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimations(),
    importProvidersFrom(MatSnackBarModule),
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { enterAnimationDuration: '200ms', exitAnimationDuration: '150ms' },
    },
    StoreData,
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      inMemoryScrollingFeature,
      withPreloading(IdlePreloadStrategy)
    ),
    provideClientHydration(withEventReplay()),
    provideHttpClient(withFetch(), withInterceptors([authApiInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth())
  ]
};
