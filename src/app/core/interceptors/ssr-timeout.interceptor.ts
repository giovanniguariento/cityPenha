import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import { timeout } from 'rxjs';

/** Fail fast on SSR so Zone.js can stabilize when the API is slow or unreachable. */
export const ssrTimeoutInterceptor: HttpInterceptorFn = (req, next) => {
  if (!isPlatformServer(inject(PLATFORM_ID))) {
    return next(req);
  }

  return next(req).pipe(timeout(5000));
};
