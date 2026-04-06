import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, defer, of } from 'rxjs';
import { catchError, mergeMap } from 'rxjs/operators';

/**
 * Preloads lazy routes during browser idle time so the main thread stays responsive
 * after first paint, while still warming route chunks before the user navigates.
 */
@Injectable({ providedIn: 'root' })
export class IdlePreloadStrategy implements PreloadingStrategy {
  preload(_route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return defer(() => this.whenIdle()).pipe(
      mergeMap(() => load().pipe(catchError(() => of(null))))
    );
  }

  private whenIdle(): Observable<void> {
    return new Observable((subscriber) => {
      const g = globalThis as typeof globalThis & {
        requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      };
      const finish = (): void => {
        subscriber.next();
        subscriber.complete();
      };
      if (typeof g.requestIdleCallback === 'function') {
        g.requestIdleCallback(() => finish(), { timeout: 4000 });
      } else {
        setTimeout(finish, 0);
      }
    });
  }
}
