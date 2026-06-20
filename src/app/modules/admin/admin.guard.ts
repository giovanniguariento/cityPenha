import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { catchError, from, map, of, switchMap } from 'rxjs';
import { FeedbackService } from '../../shared/services/feedback.service';
import { AdminService } from './services/admin.service';

/**
 * Bloqueia acesso a `/admin` para não-admins. Faz probe em GET /admin/metrics:
 * - 200: libera.
 * - 401/403: redireciona para /home (sem mensagem para não revelar o painel).
 * - Outro erro (rede, 5xx): redireciona para /home com mensagem amigável.
 */
export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const admin = inject(AdminService);
  const router = inject(Router);
  const feedback = inject(FeedbackService);

  return from(auth.authStateReady()).pipe(
    switchMap(() => {
      if (!auth.currentUser) {
        return of(router.createUrlTree(['/login']));
      }

      return admin.probeAccess().pipe(
        map((ok) => (ok ? true : router.createUrlTree(['/home']))),
        catchError(() => {
          feedback.showError('Não foi possível verificar o acesso administrativo. Tente novamente.');
          return of(router.createUrlTree(['/home']));
        })
      );
    })
  );
};
