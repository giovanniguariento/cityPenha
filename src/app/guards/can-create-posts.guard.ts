import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, map, of, switchMap, take, catchError } from 'rxjs';
import { AuthService } from '../shared/services/auth.service';
import { HomeService } from '../modules/home/services/home.service';

export const canCreatePostsGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const homeService = inject(HomeService);
  const router = inject(Router);

  return from(auth.authStateReady()).pipe(
    switchMap(() => authService.user$.pipe(take(1))),
    switchMap((user) => {
      if (!user) {
        router.navigate(['/login']);
        return of(false);
      }
      return homeService.getMe().pipe(
        map((me) => {
          if (me.user.canCreatePosts === true) {
            return true;
          }
          router.navigate(['/home']);
          return false;
        }),
        catchError(() => {
          router.navigate(['/home']);
          return of(false);
        })
      );
    })
  );
};
