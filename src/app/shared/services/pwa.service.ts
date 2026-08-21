import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

/**
 * Evento `beforeinstallprompt` (Chromium). Não faz parte do lib DOM padrão,
 * por isso o tipamos manualmente.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);

  /** Evento de instalação guardado (Android/Chromium) para disparar depois. */
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /** `true` quando o Chromium sinalizou que o app é instalável via prompt. */
  readonly canInstall = signal(false);

  /** `true` depois que o app foi instalado nesta sessão. */
  readonly installed = signal(false);

  /** `true` em iPhone/iPad no Safari (não há prompt programático). */
  readonly isIos = computed(() => this.detectIos());

  /** `true` quando já está rodando como app instalado (standalone). */
  readonly isStandalone = computed(() => this.detectStandalone());

  private initialized = false;

  /** Registra o service worker e começa a escutar os eventos de instalação. */
  init(): void {
    if (this.initialized || !isPlatformBrowser(this.platformId)) {
      return;
    }
    this.initialized = true;

    const win = this.doc.defaultView;
    if (!win) {
      return;
    }

    win.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.deferredPrompt = event as BeforeInstallPromptEvent;
      this.canInstall.set(true);
    });

    win.addEventListener('appinstalled', () => {
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.installed.set(true);
    });

    this.registerServiceWorker(win);
  }

  /**
   * Dispara o prompt nativo de instalação (Android/Chromium).
   * Retorna `true` se o usuário aceitou instalar.
   */
  async promptInstall(): Promise<boolean> {
    const event = this.deferredPrompt;
    if (!event) {
      return false;
    }
    await event.prompt();
    const choice = await event.userChoice;
    this.deferredPrompt = null;
    this.canInstall.set(false);
    if (choice.outcome === 'accepted') {
      this.installed.set(true);
      return true;
    }
    return false;
  }

  private registerServiceWorker(win: Window): void {
    const nav = win.navigator;
    if (!('serviceWorker' in nav)) {
      return;
    }
    win.addEventListener('load', () => {
      void nav.serviceWorker.register('/sw.js').catch(() => {
        // Falha ao registrar não deve quebrar a aplicação.
      });
    });
  }

  private detectIos(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const nav = this.doc.defaultView?.navigator;
    if (!nav) {
      return false;
    }
    const ua = nav.userAgent;
    const isIphoneOrIpad = /iPad|iPhone|iPod/.test(ua);
    // iPadOS 13+ se identifica como Mac; detecta pelo touch.
    const isIpadOs = ua.includes('Macintosh') && nav.maxTouchPoints > 1;
    return isIphoneOrIpad || isIpadOs;
  }

  private detectStandalone(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return false;
    }
    const win = this.doc.defaultView;
    if (!win) {
      return false;
    }
    const mediaStandalone = win.matchMedia?.('(display-mode: standalone)').matches ?? false;
    // iOS Safari usa a propriedade não-padrão `navigator.standalone`.
    const iosStandalone = (win.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return mediaStandalone || iosStandalone;
  }
}
