import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Anexa `Authorization: Bearer <Firebase ID token>` às requisições à API do app.
 * Sem usuário Firebase, a requisição segue sem header (rotas optionalAuth).
 *
 * Verifica `currentUser` de forma síncrona primeiro. Se null, encaminha imediatamente
 * para não bloquear o HTTP Transfer Cache durante a hidratação SSR: aguardar
 * `authStateReady()` tornaria toda requisição assíncrona, causando um flash de skeleton
 * mesmo com os dados já disponíveis no cache.
 * Rotas protegidas não são afetadas pois o auth guard garante que o componente só
 * carrega após o Firebase resolver o estado de autenticação.
 */
export const authApiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = environment.apiUrl;
  if (!req.url.startsWith(apiUrl)) {
    return next(req);
  }

  if (isPlatformServer(inject(PLATFORM_ID))) {
    return next(req);
  }

  const auth = inject(Auth);
  const user = auth.currentUser;

  if (!user) {
    return next(req);
  }

  return from(user.getIdToken()).pipe(
    switchMap((token) => {
      if (!token) {
        return next(req);
      }
      return next(
        req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        })
      );
    })
  );
};
