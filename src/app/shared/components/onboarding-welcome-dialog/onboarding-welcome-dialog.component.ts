import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-onboarding-welcome-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './onboarding-welcome-dialog.component.html',
  styleUrl: './onboarding-welcome-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingWelcomeDialogComponent {
  private readonly dialogRef = inject(MatDialogRef<OnboardingWelcomeDialogComponent>);

  start(): void {
    this.dialogRef.close('start');
  }

  skip(): void {
    this.dialogRef.close('skip');
  }
}
