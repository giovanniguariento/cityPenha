import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '@angular/fire/auth';
import { LoginRequiredDialogComponent } from '../../../../shared/components/login-required-dialog/login-required-dialog.component';

@Component({
  selector: 'app-card-exp',
  imports: [],
  templateUrl: './card-exp.component.html',
  standalone: true,
  styleUrl: './card-exp.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardExpComponent {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(Auth);

  onMissionsActivate(event?: Event): void {
    if (event instanceof KeyboardEvent && event.key === ' ') {
      event.preventDefault();
    }
    if (this.auth.currentUser) {
      this.router.navigate(['/missions']);
    } else {
      this.dialog.open(LoginRequiredDialogComponent, {
        data: { isMissionsGateContext: true }
      });
    }
  }
}
