import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import {
  ADSENSE_ALLOWED_PATH_PREFIXES,
  ADSENSE_BLOCKED_PATH_PREFIXES,
  ADSENSE_CLIENT,
} from '../constants/adsense';

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * Injects the AdSense loader only in the browser, only on routes that serve
 * publisher content, and only after a page explicitly opts in via `enable()`.
 *
 * Empty shells (login, 404, thin articles) never call `enable()`, so the
 * script never loads — which is what AdSense's "ads on screens without
 * publisher content" policy requires.
 */
@Injectable({ providedIn: 'root' })
export class AdsenseLoaderService {
  private readonly doc = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  private scriptInjected = false;
  private enabledForCurrentRoute = false;

  constructor() {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        this.enabledForCurrentRoute = false;
      });
  }

  /**
   * Opt-in for the current route once publisher content is ready.
   * No-ops on the server, on blocked paths, and when already injected.
   */
  enable(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    const path = this.router.url.split('?')[0] ?? '';
    if (!this.isPathEligible(path)) {
      return;
    }
    this.enabledForCurrentRoute = true;
    this.injectScript();
  }

  /** True after a successful `enable()` on the current navigation. */
  isEnabled(): boolean {
    return this.enabledForCurrentRoute && this.scriptInjected;
  }

  /** Pushes a pending `<ins class="adsbygoogle">` unit to the AdSense queue. */
  pushAd(): void {
    if (!isPlatformBrowser(this.platformId) || !this.isEnabled()) {
      return;
    }
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      // Ad blockers / missing network — fail silently.
    }
  }

  private isPathEligible(path: string): boolean {
    if (ADSENSE_BLOCKED_PATH_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
      return false;
    }
    return ADSENSE_ALLOWED_PATH_PREFIXES.some(
      (p) => path === p || path.startsWith(p.endsWith('/') ? p : `${p}/`) || path.startsWith(p)
    );
  }

  private injectScript(): void {
    if (this.scriptInjected) {
      return;
    }
    if (this.doc.querySelector(`script[data-adsense-client="${ADSENSE_CLIENT}"]`)) {
      this.scriptInjected = true;
      return;
    }

    const script = this.doc.createElement('script');
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    script.crossOrigin = 'anonymous';
    script.setAttribute('data-adsense-client', ADSENSE_CLIENT);
    this.doc.head.appendChild(script);
    this.scriptInjected = true;
  }
}
