import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { first } from 'rxjs/operators';
import { AuthService } from '../../shared/services/auth.service';
import { HomeService } from '../home/services/home.service';
import { PublicUser } from '../../shared/interface/home.interface';
import { FeedbackService } from '../../shared/services/feedback.service';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { firebaseAuthErrorMessage } from '../../shared/utils/firebase-auth-error-message';
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component';
import { SeoService } from '../../shared/services/seo.service';
import { SITE_URL } from '../../shared/constants/site-url';

@Component({
  selector: 'app-login-email-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressSpinnerModule, RouterLink, LegalFooterComponent],
  templateUrl: './login-email.page.html',
  styleUrl: './login-email.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginEmailPage {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);
  private readonly seo = inject(SeoService);

  readonly submitting = signal(false);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {
    this.seo.setNoIndexPage({
      title: 'Entrar com e-mail',
      description: 'Faça login no CityPenha com e-mail e senha.',
      url: `${SITE_URL}/login/email`,
    });
  }
  goBack(): void {
    void this.router.navigate(['/login']);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  onSocialLogin(_provider: string): void {
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
          next: (res: PublicUser) => {
            this.submitting.set(false);
            if (res?.id) {
              try {
                localStorage.setItem('userId', res.id);
              } catch {
                // ignore storage errors
              }
            }
            void this.router.navigate(['/home']);
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

  async onSubmit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.feedback.showError('Preencha todos os campos corretamente.');
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.submitting.set(true);
    try {
      const authentication = await this.authService.loginWithEmail(email, password);

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
            void this.router.navigate(['/home']);
          },
          error: (err: unknown) => {
            this.submitting.set(false);
            this.feedback.showError(
              apiErrorMessage(err, 'Não foi possível completar o login. Tente novamente.')
            );
          },
        });
    } catch (err: unknown) {
      this.submitting.set(false);
      this.feedback.showError(
        firebaseAuthErrorMessage(err, 'Não foi possível iniciar sessão. Tente novamente.')
      );
    }
  }
}
