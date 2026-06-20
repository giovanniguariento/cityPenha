import { HttpInterceptorFn } from '@angular/common/http';
import { isPlatformServer } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { User } from 'firebase/auth';
import { catchError, EMPTY, from, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../shared/services/auth.service';
import { FeedbackService } from '../../shared/services/feedback.service';
import { isInvalidOrExpiredTokenError } from '../../shared/utils/api-error-message';

const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Faça login novamente.';

let revokingSession = false;

/**
 * Anexa `Authorization: Bearer <Firebase ID token>` às requisições à API do app.
 * Sem usuário Firebase, a requisição segue sem header (rotas optionalAuth).
 *
 * Verifica `currentUser` de forma síncrona primeiro. Se null, aguarda
 * `authStateReady()` antes de decidir — necessário para guards/resolvers que
 * disparam HTTP logo após o Firebase emitir em `user$`, mas antes de `currentUser`
 * estar disponível de forma síncrona.
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
  const authService = inject(AuthService);
  const router = inject(Router);
  const feedback = inject(FeedbackService);

  const redirectToLoginWithFeedback = () =>
    from(router.navigateByUrl('/login', { replaceUrl: true })).pipe(
      switchMap(() => {
        feedback.showError(SESSION_EXPIRED_MESSAGE);
        return EMPTY;
      })
    );

  const revokeSession = () => {
    if (revokingSession) {
      return EMPTY;
    }
    revokingSession = true;
    return from(authService.logout()).pipe(
      switchMap(() => redirectToLoginWithFeedback()),
      catchError(() => redirectToLoginWithFeedback())
    );
  };

  const forward = (request: typeof req) =>
    next(request).pipe(
      catchError((err) => {
        if (isInvalidOrExpiredTokenError(err)) {
          return revokeSession();
        }
        return throwError(() => err);
      })
    );

  const attachToken = (user: User) =>
    from(user.getIdToken()).pipe(
      switchMap((token) => {
        if (!token) {
          return forward(req);
        }
        return forward(
          req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
          })
        );
      })
    );

  const user = auth.currentUser;
  if (user) {
    return attachToken(user);
  }

  return from(auth.authStateReady()).pipe(
    switchMap(() => {
      const readyUser = auth.currentUser;
      return readyUser ? attachToken(readyUser) : forward(req);
    })
  );
};
