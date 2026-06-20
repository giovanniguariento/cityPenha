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
  apiKey: 'AIzaSyBpptYiBk1xbODoBNcz2gwYEdWaswuU08k',
  authDomain: 'citypenha-app.firebaseapp.com',
  projectId: 'citypenha-app',
  storageBucket: 'citypenha-app.firebasestorage.app',
  messagingSenderId: '232056034622',
  appId: '1:232056034622:web:13c55e536f3624fff3086f',
  measurementId: 'G-P559NKCL9L',
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
