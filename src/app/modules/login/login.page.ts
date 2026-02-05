import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { HomeService } from '../home/services/home.service';
import { SignupResponse } from '../../shared/interface/home.interface';
import { first } from 'rxjs/operators';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly homeService = inject(HomeService);

  onSkip(): void {
    this.router.navigate(['/home']);
  }

  onLogin(_provider: string): void {
    // Placeholder for future provider implementations
  }

  async googleLogin(): Promise<void> {
    try {
      const authentication = await this.authService.loginWithGoogle();
      this.homeService.signup(authentication)
        .pipe(first())
        .subscribe({
          next: (res: SignupResponse) => {
            // store returned user id (if provided) for later requests
            if (res && res.id) {
              try {
                localStorage.setItem('userId', res.id);
              } catch {
                // ignore storage errors
              }
            }
            this.router.navigate(['/home']);
          },
          error: () => {
            // Still navigate even if signup fails
            this.router.navigate(['/home']);
          }
        });
    } catch {
      // Error handling is done in auth service
    }
  }

  logout(): Promise<void> {
    return this.authService.logout();
  }
}
