import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '@angular/fire/auth';
import { LoginRequiredDialogComponent } from '../../../../shared/components/login-required-dialog/login-required-dialog.component';
import { InstallStepsSheetComponent } from '../../../../shared/components/install-steps-sheet/install-steps-sheet.component';
import { OnboardingService } from '../../../../shared/services/onboarding.service';
import { PwaService } from '../../../../shared/services/pwa.service';

/** `<swiper-container>`, do bundle do Swiper carregado por CDN no index.html. */
type SwiperContainer = HTMLElement & { swiper?: unknown; initialize(): void };

@Component({
  selector: 'app-card-exp',
  imports: [InstallStepsSheetComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './card-exp.component.html',
  standalone: true,
  styleUrl: './card-exp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardExpComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(Auth);
  private readonly onboarding = inject(OnboardingService);
  private readonly pwa = inject(PwaService);

  /** Convite para instalar, para quem já dispensou o banner. */
  readonly showInstallSlide = this.pwa.showHomeInstallSlide;

  /** Passo a passo de instalação manual. */
  readonly showInstallSteps = signal(false);

  private readonly swiper = viewChild<ElementRef<SwiperContainer>>('swiper');

  constructor() {
    // O carrossel usa `init=false`. O elemento chega pronto no HTML do servidor
    // e se inicializaria durante o parse, antes de o Angular montar os slides
    // que só o cliente conhece — o Swiper fixaria o loop com o conjunto errado
    // e a numeração da paginação sairia do lugar ao arrastar.
    afterNextRender(() => {
      void customElements.whenDefined('swiper-container').then(() => {
        const el = this.swiper()?.nativeElement;
        if (el && !el.swiper) {
          el.initialize();
        }
      });
    });
  }

  onMissionsActivate(event?: Event): void {
    if (event instanceof KeyboardEvent && event.key === ' ') {
      event.preventDefault();
    }
    if (this.auth.currentUser) {
      this.router.navigate(['/missions']);
    } else {
      this.dialog.open(LoginRequiredDialogComponent, {
        data: { isMissionsGateContext: true }
      });
    }
  }

  onReplayOnboarding(event?: Event): void {
    if (event instanceof KeyboardEvent && event.key === ' ') {
      event.preventDefault();
    }
    this.onboarding.start();
  }

  async onInstallActivate(event?: Event): Promise<void> {
    if (event instanceof KeyboardEvent && event.key === ' ') {
      event.preventDefault();
    }
    if (this.pwa.canInstall()) {
      await this.pwa.promptInstall();
      return;
    }
    this.showInstallSteps.set(true);
  }

  closeInstallSteps(): void {
    this.showInstallSteps.set(false);
  }
}
