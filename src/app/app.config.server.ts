import { ApplicationConfig, mergeApplicationConfig } from '@angular/core';
import { InMemoryScrollingOptions, provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { Auth } from '@angular/fire/auth';

import { routes } from './app.routes';
import { serverRoutes } from './app.routes.server';
import { sharedAppConfig } from './app.config.shared';
import { serverAuthStub } from './core/auth/server-auth.stub';

const scrollConfig: InMemoryScrollingOptions = {
  scrollPositionRestoration: 'top',
};

const serverAppConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    provideRouter(routes, withInMemoryScrolling(scrollConfig)),
    { provide: Auth, useValue: serverAuthStub },
  ],
};

export const config = mergeApplicationConfig(sharedAppConfig, serverAppConfig);
