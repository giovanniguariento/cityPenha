import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../shared/services/auth.service';
import { FeedbackService } from '../../shared/services/feedback.service';
import { firebaseAuthErrorMessage } from '../../shared/utils/firebase-auth-error-message';
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component';
import { SeoService } from '../../shared/services/seo.service';
import { SITE_URL } from '../../shared/constants/site-url';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, MatProgressSpinnerModule, LegalFooterComponent],
  templateUrl: './forgot-password.page.html',
  styleUrl: './forgot-password.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly feedback = inject(FeedbackService);
  private readonly seo = inject(SeoService);

  readonly submitting = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.seo.setNoIndexPage({
      title: 'Recuperar senha',
      description: 'Recupere o acesso à sua conta CityPenha.',
      url: `${SITE_URL}/login/forgot-password`,
    });
    const email = this.router.getCurrentNavigation()?.extras?.state?.['email'];
    if (typeof email === 'string' && email.trim()) {
      this.form.patchValue({ email: email.trim() });
    }
  }

  goBack(): void {
    void this.router.navigate(['/login/email']);
  }

  async onSubmit(): Promise<void> {
    if (this.submitting()) {
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.feedback.showError('Informe um e-mail válido.');
      return;
    }

    const { email } = this.form.getRawValue();

    this.submitting.set(true);
    try {
      await this.authService.sendPasswordResetEmail(email);
      this.submitting.set(false);
      this.feedback.showSuccess('Enviamos um link de recuperação para o seu e-mail.');
      void this.router.navigate(['/login/email']);
    } catch (err: unknown) {
      this.submitting.set(false);
      this.feedback.showError(
        firebaseAuthErrorMessage(err, 'Não foi possível enviar o e-mail de recuperação.')
      );
    }
  }
}
