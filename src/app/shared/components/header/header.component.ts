import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { LoginRequiredDialogComponent } from '../login-required-dialog/login-required-dialog.component';
import { Auth } from '@angular/fire/auth';
import { APP_ASSETS } from '../../constants/app-assets';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(Auth);
  private readonly feedback = inject(FeedbackService);

  readonly logoUrl = APP_ASSETS.logo;

  onFrequenciaClick(): void {
    const firebaseUser = this.auth.currentUser;
    if (firebaseUser) {
      this.router.navigate(['/frequencia']);
    } else {
      this.dialog.open(LoginRequiredDialogComponent, {
        data: { points: 10, actionLabel: 'acessar a frequência', noRedirect: true, isFrequencyContext: true }
      });
    }
  }

  onNotificationsClick(): void {
    this.feedback.showComingSoon();
  }
}
