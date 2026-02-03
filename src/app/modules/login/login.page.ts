import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { HomeService } from '../home/services/home.service';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.page.html',
  styleUrl: './login.page.scss'
})
export class LoginPage {
  private router: Router = inject(Router);
  private authService: AuthService = inject(AuthService);
  homeService: HomeService = inject(HomeService);

  onSkip() {
    this.router.navigate(["/home"]);
  }

  onLogin(provider: string) {
    console.log('Login com', provider);
  }

  async googleLogin() {
    try {
      await this.authService.loginWithGoogle();
      this.homeService.signup(this.authService.authentication).subscribe((response) => {
        console.log(response)
      })

      this.router.navigate(['/home']);
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  }

  logout() {
    this.authService.logout();
  }
}
