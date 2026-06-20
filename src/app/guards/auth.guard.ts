import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, map, switchMap, take } from 'rxjs';
import { AuthService } from '../shared/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const router = inject(Router);

  return from(auth.authStateReady()).pipe(
    switchMap(() => authService.user$.pipe(take(1))),
    map((user) => {
      if (user) {
        return true;
      }
      router.navigate(['/login']);
      return false;
    })
  );
};
