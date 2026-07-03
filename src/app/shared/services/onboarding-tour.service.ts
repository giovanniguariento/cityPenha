import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import type { Driver } from 'driver.js';
import { OnboardingStep } from '../constants/onboarding-steps';

/** Tempo máximo de espera por um elemento após navegar de rota (ms). */
const ELEMENT_TIMEOUT_MS = 5000;

/**
 * Orquestra o tour guiado (driver.js) através de várias rotas.
 * Mantém uma única instância do driver e reposiciona o destaque a cada passo,
 * navegando com o Router e aguardando o elemento alvo aparecer no DOM.
 */
@Injectable({ providedIn: 'root' })
export class OnboardingTourService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);

  private driverInstance: Driver | null = null;
  private steps: OnboardingStep[] = [];
  private currentIndex = 0;
  private running = false;
  private onFinishCallback: (() => void) | null = null;
  /** Rota para a qual navegar quando o usuário anônimo aceita criar conta. */
  private accountCtaRoute: string | null = null;

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Inicia o tour. `onFinish` é chamado uma única vez ao concluir, pular ou fechar.
   * `accountCtaRoute` (opcional) leva o usuário a esta rota se ele encerrar num passo sem alvo (CTA de conta).
   */
  async start(steps: OnboardingStep[], onFinish?: () => void, accountCtaRoute?: string): Promise<void> {
    if (!isPlatformBrowser(this.platformId) || this.running || steps.length === 0) {
      return;
    }
    const { driver } = await import('driver.js');
    this.steps = steps;
    this.currentIndex = 0;
    this.running = true;
    this.onFinishCallback = onFinish ?? null;
    this.accountCtaRoute = accountCtaRoute ?? null;

    this.driverInstance = driver({
      animate: true,
      allowClose: true,
      disableActiveInteraction: true,
      overlayColor: '#000000',
      overlayOpacity: 0.6,
      stagePadding: 6,
      stageRadius: 12,
      popoverClass: 'citypenha-tour',
      showProgress: false,
      onDestroyed: () => this.handleDestroyed(),
    });

    await this.showStep(0);
  }

  private async showStep(index: number): Promise<void> {
    const driverInstance = this.driverInstance;
    if (!driverInstance || !this.running) {
      return;
    }

    const step = this.steps[index];
    this.currentIndex = index;

    const currentPath = this.router.url.split('?')[0].split('#')[0];
    if (step.route && currentPath !== step.route) {
      await this.router.navigateByUrl(step.route);
    }

    let element: Element | undefined;
    if (step.element) {
      element = (await this.waitForElement(step.element)) ?? undefined;
      // Se o alvo não apareceu, pula para o próximo passo em vez de travar.
      if (!element) {
        if (index < this.steps.length - 1) {
          await this.showStep(index + 1);
        } else {
          this.finish();
        }
        return;
      }
    }

    if (!this.running || this.driverInstance !== driverInstance) {
      return;
    }

    const isLast = index === this.steps.length - 1;
    const isFirst = index === 0;
    const showButtons: ('next' | 'previous' | 'close')[] = ['next', 'close'];
    if (!isFirst) {
      showButtons.push('previous');
    }

    driverInstance.highlight({
      element,
      popover: {
        title: step.title,
        description: step.description,
        side: step.side ?? 'bottom',
        align: step.align ?? 'center',
        showButtons,
        showProgress: true,
        progressText: `${index + 1} de ${this.steps.length}`,
        nextBtnText: isLast ? (step.finishBtnText ?? 'Concluir') : 'Próximo',
        prevBtnText: 'Anterior',
        onNextClick: () => this.next(),
        onPrevClick: () => this.prev(),
        onCloseClick: () => this.finish(),
      },
    });
  }

  private next(): void {
    if (this.currentIndex >= this.steps.length - 1) {
      this.finish(true);
      return;
    }
    // Adia para o hook do driver retornar antes de reposicionar o destaque.
    const target = this.currentIndex + 1;
    queueMicrotask(() => void this.showStep(target));
  }

  private prev(): void {
    if (this.currentIndex <= 0) {
      return;
    }
    const target = this.currentIndex - 1;
    queueMicrotask(() => void this.showStep(target));
  }

  /** Encerra o tour. `completedNormally` distingue "Concluir" de "Pular/Fechar". */
  private finish(completedNormally = false): void {
    const lastStep = this.steps[this.currentIndex];
    const goToAccountCta =
      completedNormally && !!this.accountCtaRoute && !!lastStep && !lastStep.element;

    this.driverInstance?.destroy();

    if (goToAccountCta && this.accountCtaRoute) {
      void this.router.navigateByUrl(this.accountCtaRoute);
    }
  }

  private handleDestroyed(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.driverInstance = null;
    const callback = this.onFinishCallback;
    this.onFinishCallback = null;
    callback?.();
  }

  /** Faz polling por um elemento até aparecer ou expirar o tempo limite. */
  private waitForElement(selector: string): Promise<Element | null> {
    return new Promise((resolve) => {
      const existing = document.querySelector(selector);
      if (existing) {
        resolve(existing);
        return;
      }

      const deadline = Date.now() + ELEMENT_TIMEOUT_MS;
      const poll = () => {
        const found = document.querySelector(selector);
        if (found) {
          resolve(found);
          return;
        }
        if (Date.now() >= deadline || !this.running) {
          resolve(null);
          return;
        }
        requestAnimationFrame(poll);
      };
      requestAnimationFrame(poll);
    });
  }
}
