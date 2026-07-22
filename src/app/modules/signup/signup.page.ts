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
  selector: 'app-signup-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressSpinnerModule, RouterLink, LegalFooterComponent],
  templateUrl: './signup.page.html',
  styleUrl: './signup.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignupPage {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);
  private readonly seo = inject(SeoService);

  readonly submitting = signal(false);
  readonly showPassword = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    acceptTerms: [false, Validators.requiredTrue],
  });

  constructor() {
    this.seo.setNoIndexPage({
      title: 'Criar conta',
      description: 'Crie sua conta no CityPenha.',
      url: `${SITE_URL}/signup`,
    });
  }
  goBack(): void {
    void this.router.navigate(['/login']);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  async onSubmit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.controls.acceptTerms.invalid) {
      this.feedback.showError('Aceite os Termos e a Política de Privacidade para continuar.');
    }

    if (this.form.invalid) {
      this.feedback.showError('Preencha todos os campos corretamente.');
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    const trimmedName = name.trim();

    this.submitting.set(true);
    try {
      const authentication = await this.authService.signUpWithEmail(
        email,
        password,
        trimmedName
      );

      this.homeService
        .signup(authentication, { name: trimmedName })
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
            this.feedback.showSuccess('Conta criada com sucesso!');
            void this.router.navigate(['/home']);
          },
          error: (err: unknown) => {
            this.submitting.set(false);
            this.feedback.showError(
              apiErrorMessage(err, 'Não foi possível completar o cadastro. Tente novamente.')
            );
          },
        });
    } catch (err: unknown) {
      this.submitting.set(false);
      this.feedback.showError(firebaseAuthErrorMessage(err));
    }
  }
}
