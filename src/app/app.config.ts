import {
  ApplicationConfig,
  importProvidersFrom,
  mergeApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { InMemoryScrollingOptions, provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import localePt from '@angular/common/locales/pt';
import { registerLocaleData } from '@angular/common';

import { routes } from './app.routes';
import { IdlePreloadStrategy } from './core/routing/idle-preload.strategy';
import { sharedAppConfig } from './app.config.shared';
import { StoreData } from './shared/store/store';

registerLocaleData(localePt);

const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
};

const inMemoryScrollingFeature = withInMemoryScrolling(scrollConfig);

const firebaseConfig = {
  projectId: 'citypenha',
  appId: '1:771190117440:web:df15e21d9dd4914bf2fba5',
  storageBucket: 'citypenha.firebasestorage.app',
  apiKey: 'AIzaSyD0LfWjCrt5v1dDGGQMS8Qpe8tcUQPfMTs',
  authDomain: 'citypenha.firebaseapp.com',
  messagingSenderId: '771190117440',
  projectNumber: '771190117440',
};

const browserAppConfig: ApplicationConfig = {
  providers: [
    StoreData,
    provideAnimations(),
    importProvidersFrom(MatSnackBarModule),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      inMemoryScrollingFeature,
      withPreloading(IdlePreloadStrategy),
    ),
    provideClientHydration(withEventReplay()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
  ],
};

export const appConfig = mergeApplicationConfig(sharedAppConfig, browserAppConfig);
