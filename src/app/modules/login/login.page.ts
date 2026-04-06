import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../shared/services/auth.service';
import { HomeService } from '../home/services/home.service';
import { BackendUser } from '../../shared/interface/home.interface';
import { FeedbackService } from '../../shared/services/feedback.service';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, MatProgressSpinnerModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);

  readonly submitting = signal(false);

  onSkip(): void {
    this.router.navigate(['/home']);
  }

  onLogin(_provider: string): void {
    // Placeholder for future provider implementations
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
          next: (res: BackendUser) => {
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
