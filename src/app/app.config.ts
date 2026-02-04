import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { InMemoryScrollingOptions, provideRouter, withInMemoryScrolling, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { StoreData } from './shared/store/store';
import { provideHttpClient, withFetch } from '@angular/common/http';
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
    StoreData,
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withViewTransitions(), inMemoryScrollingFeature),
    provideClientHydration(withEventReplay()),
    provideHttpClient(
      withFetch(),
    ),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth())
  ]
};
