import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { PwaService } from '../../services/pwa.service';

const DISMISS_KEY = 'citypenha_install_dismissed_at';
/** Após dispensar, só reaparece depois desse período. */
const DISMISS_DURATION_MS = 1000 * 60 * 60 * 24 * 14; // 14 dias

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './install-prompt.component.html',
  styleUrl: './install-prompt.component.scss',
})
export class InstallPromptComponent {
  private readonly pwa = inject(PwaService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly doc = inject(DOCUMENT);

  /** Usuário dispensou o convite (persistido em localStorage). */
  private readonly dismissed = signal(this.isRecentlyDismissed());

  /** Mostra as instruções detalhadas do iOS. */
  readonly showIosSteps = signal(false);

  readonly isIos = this.pwa.isIos;
  readonly canInstall = this.pwa.canInstall;

  /** Convite deve aparecer? */
  readonly visible = computed(() => {
    if (!isPlatformBrowser(this.platformId) || this.pwa.isStandalone() || this.dismissed()) {
      return false;
    }
    return this.canInstall() || this.isIos();
  });

  async install(): Promise<void> {
    const accepted = await this.pwa.promptInstall();
    if (accepted) {
      this.dismissed.set(true);
    }
  }

  openIosSteps(): void {
    this.showIosSteps.set(true);
  }

  closeIosSteps(): void {
    this.showIosSteps.set(false);
  }

  dismiss(): void {
    this.dismissed.set(true);
    this.showIosSteps.set(false);
    this.persistDismiss();
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

  private persistDismiss(): void {
    try {
      this.storage()?.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage pode estar indisponível (modo privado). Ignora.
    }
  }

  private storage(): Storage | null {
    if (!isPlatformBrowser(this.platformId)) {
      return null;
    }
    try {
      return this.doc.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }
}
