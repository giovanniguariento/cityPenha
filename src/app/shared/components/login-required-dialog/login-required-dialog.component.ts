import { Component, Inject } from '@angular/core';
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
  styleUrls: ['./login-required-dialog.component.scss']
})
export class LoginRequiredDialogComponent {
  points = 10;
  actionLabel = '';
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
  }

  close() {
    this.dialogRef.close('cancel');
  }

  login() {
    this.dialogRef.close('login');
    this.router.navigate(['/login']);
  }
}

