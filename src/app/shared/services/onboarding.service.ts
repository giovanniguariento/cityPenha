import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '@angular/fire/auth';
import { OnboardingTourService } from './onboarding-tour.service';
import { OnboardingWelcomeDialogComponent } from '../components/onboarding-welcome-dialog/onboarding-welcome-dialog.component';
import { buildOnboardingSteps, OnboardingContext, ONBOARDING_STORAGE_KEY } from '../constants/onboarding-steps';

/**
 * Ponto de entrada do onboarding. Decide se deve mostrar o tour na primeira visita,
 * abre o modal de boas-vindas e delega os passos guiados ao OnboardingTourService.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(Auth);
  private readonly tour = inject(OnboardingTourService);

  /** Já concluiu (ou dispensou) o onboarding? No servidor retorna sempre true para não disparar. */
  hasCompleted(): boolean {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    try {
      return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1';
    } catch {
      return true;
    }
  }

  private markCompleted(): void {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
  }

  /** Reinicia o estado para permitir rever o tour (usado no Perfil). */
  reset(): void {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
  }

  /**
   * Abre o modal de boas-vindas e, ao confirmar, inicia o tour guiado.
   * Qualquer desfecho (concluir, pular ou dispensar) marca o onboarding como visto.
   */
  start(context: OnboardingContext = {}): void {
    if (!isPlatformBrowser(this.platformId) || this.tour.isRunning()) {
      return;
    }

    const dialogRef = this.dialog.open(OnboardingWelcomeDialogComponent, {
      panelClass: 'onboarding-welcome-dialog',
      maxWidth: '92vw',
      autoFocus: false,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result !== 'start') {
        this.markCompleted();
        return;
      }

      const isLoggedIn = !!this.auth.currentUser;
      const steps = buildOnboardingSteps(isLoggedIn, context);
      const accountCtaRoute = isLoggedIn ? undefined : '/signup';

      void this.tour.start(steps, () => this.markCompleted(), accountCtaRoute);
    });
  }
}
