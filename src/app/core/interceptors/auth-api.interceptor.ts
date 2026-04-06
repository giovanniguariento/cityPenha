import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Anexa `Authorization: Bearer <Firebase ID token>` às requisições à API do app.
 * Sem usuário Firebase, a requisição segue sem header (rotas optionalAuth).
 */
export const authApiInterceptor: HttpInterceptorFn = (req, next) => {
  const apiUrl = environment.apiUrl;
  if (!req.url.startsWith(apiUrl)) {
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
