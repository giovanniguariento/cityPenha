import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../shared/services/auth.service';
import { HomeService } from '../home/services/home.service';
import { PublicUser } from '../../shared/interface/home.interface';
import { FeedbackService } from '../../shared/services/feedback.service';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { first } from 'rxjs/operators';
import { APP_ASSETS } from '../../shared/constants/app-assets';
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component';
import { SeoService } from '../../shared/services/seo.service';
import { SITE_URL } from '../../shared/constants/site-url';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule, RouterLink, LegalFooterComponent],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);
  private readonly seo = inject(SeoService);

  readonly submitting = signal(false);
  readonly logoUrl = APP_ASSETS.logo;

  constructor() {
    this.seo.setNoIndexPage({
      title: 'Entrar',
      description: 'Faça login no CityPenha.',
      url: `${SITE_URL}/login`,
    });
  }

  onSkip(): void {
    this.router.navigate(['/home']);
  }

  onLogin(provider: string): void {
    if (provider === 'email') {
      void this.router.navigate(['/login/email']);
      return;
    }

    if (provider === 'apple' || provider === 'facebook') {
      this.feedback.showComingSoon();
    }
  }

  async googleLogin(): Promise<void> {
    if (this.submitting()) {
      return;
    }
    this.submitting.set(true);
    try {
      const authentication = await this.authService.loginWithGoogle();
      this.homeService
        .signup(authentication)
        .pipe(first())
        .subscribe({
          next: (res: PublicUser) => {
            this.submitting.set(false);
            if (res?.id) {
              try {
                localStorage.setItem('userId', res.id);
              } catch {
                // ignore storage errors
              }
            }
            this.router.navigate(['/home']);
          },
          error: (err: unknown) => {
            this.submitting.set(false);
            this.feedback.showError(
              apiErrorMessage(err, 'Não foi possível completar o cadastro. Tente novamente.')
            );
          },
        });
    } catch {
      this.submitting.set(false);
      this.feedback.showError('Não foi possível iniciar sessão com o Google.');
    }
  }

  logout(): Promise<void> {
    return this.authService.logout();
  }
}
