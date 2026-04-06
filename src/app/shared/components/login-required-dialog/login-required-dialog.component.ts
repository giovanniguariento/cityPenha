import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-required-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './login-required-dialog.component.html',
  styleUrls: ['./login-required-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginRequiredDialogComponent {
  points = 10;
  actionLabel = '';
  /** When true, buttons only close the dialog without navigating. */
  noRedirect = false;
  /** When true, show the frequency-page message (earn points by visiting daily and reading). */
  isFrequencyContext = false;
  /** When true, show missions-entry copy (login required + general points/benefits). */
  isMissionsGateContext = false;

  constructor(
    private router: Router,
    private dialogRef: MatDialogRef<LoginRequiredDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    if (data && typeof data.points === 'number') {
      this.points = data.points;
    }
    if (data && data.actionLabel) {
      this.actionLabel = data.actionLabel;
    }
    if (data && data.noRedirect === true) {
      this.noRedirect = true;
    }
    if (data && data.isFrequencyContext === true) {
      this.isFrequencyContext = true;
    }
    if (data && data.isMissionsGateContext === true) {
      this.isMissionsGateContext = true;
    }
  }

  close() {
    this.dialogRef.close('cancel');
  }

  login() {
    this.dialogRef.close('login');
    if (!this.noRedirect) {
      this.router.navigate(['/login']);
    }
  }
}

