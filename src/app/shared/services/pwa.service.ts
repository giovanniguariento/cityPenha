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

const INSTALLED_KEY = 'citypenha_pwa_installed';
const DISMISS_KEY = 'citypenha_install_dismissed_at';
/** Após dispensar o banner flutuante, ele só reaparece depois desse período. */
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 dias

@Injectable({ providedIn: 'root' })
export class PwaService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  /** Evento de instalação guardado (Android/Chromium) para disparar depois. */
  private deferredPrompt: BeforeInstallPromptEvent | null = null;

  /** `true` quando o Chromium sinalizou que o app é instalável via prompt. */
  readonly canInstall = signal(false);

  /**
   * `true` depois que o app foi instalado. Persistido porque `appinstalled` só
   * dispara uma vez: sem a flag, o convite voltaria a aparecer em visitas pelo
   * navegador. O iOS não emite esse evento, então lá a detecção fica por conta
   * de `isStandalone`.
   */
  readonly installed = signal(this.readInstalledFlag());

  /** Banner flutuante dispensado recentemente (persistido em localStorage). */
  private readonly floatingDismissed = signal(this.isRecentlyDismissed());

  /** `true` em iPhone/iPad no Safari (não há prompt programático). */
  readonly isIos = computed(() => this.detectIos());

  /** `true` quando já está rodando como app instalado (standalone). */
  readonly isStandalone = computed(() => this.detectStandalone());

  /** O app ainda pode ser instalado por este usuário? */
  readonly shouldOfferInstall = computed(
    () => this.isBrowser && !this.isStandalone() && !this.installed(),
  );

  /** Banner flutuante deve aparecer? */
  readonly showFloatingPrompt = computed(
    () =>
      this.shouldOfferInstall() &&
      !this.floatingDismissed() &&
      (this.canInstall() || this.isIos()),
  );

  /**
   * Slide de instalação na home, para quem já dispensou o banner flutuante.
   *
   * Decidido uma única vez, na carga da página, e não como signal de propósito:
   * o carrossel da home é um Swiper em modo loop, que monta os índices dos
   * slides na inicialização. Um slide que entra ou sai depois disso desalinha a
   * numeração da paginação. Por isso o convite só entra a partir da próxima
   * visita à home — o que combina com o "Agora não" do banner.
   */
  readonly showHomeInstallSlide = this.shouldOfferInstall() && this.isRecentlyDismissed();

  private initialized = false;

  /** Registra o service worker e começa a escutar os eventos de instalação. */
  init(): void {
    if (this.initialized || !this.isBrowser) {
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
      this.markInstalled();
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
      this.markInstalled();
      return true;
    }
    return false;
  }

  /** Esconde o banner flutuante; o convite continua disponível pelo slide da home. */
  dismissFloatingPrompt(): void {
    this.floatingDismissed.set(true);
    this.writeStorage(DISMISS_KEY, String(Date.now()));
  }

  private markInstalled(): void {
    this.installed.set(true);
    this.writeStorage(INSTALLED_KEY, '1');
  }

  private readInstalledFlag(): boolean {
    return this.storage()?.getItem(INSTALLED_KEY) === '1';
  }

  private isRecentlyDismissed(): boolean {
    const raw = this.storage()?.getItem(DISMISS_KEY);
    if (!raw) {
      return false;
    }
    const at = Number(raw);
    if (!Number.isFinite(at)) {
      return false;
    }
    return Date.now() - at < DISMISS_DURATION_MS;
  }

  private writeStorage(key: string, value: string): void {
    try {
      this.storage()?.setItem(key, value);
    } catch {
      // localStorage pode estar indisponível (modo privado). Ignora.
    }
  }

  private storage(): Storage | null {
    if (!this.isBrowser) {
      return null;
    }
    try {
      return this.doc.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
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
    if (!this.isBrowser) {
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
    if (!this.isBrowser) {
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
