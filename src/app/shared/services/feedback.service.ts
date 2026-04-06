import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

const PANEL = 'app-feedback-snackbar';

@Injectable({
  providedIn: 'root',
})
export class FeedbackService {
  private readonly snackBar = inject(MatSnackBar);

  /** Mensagem neutra (erro ou aviso). */
  showError(message: string, durationMs = 4000): void {
    this.snackBar.open(message, 'Fechar', {
      duration: durationMs,
      panelClass: [PANEL, 'app-feedback-snackbar--error'],
      verticalPosition: 'bottom',
      horizontalPosition: 'center',
    });
  }

  /** Confirmação curta. */
  showSuccess(message: string, durationMs = 3000): void {
    this.snackBar.open(message, 'OK', {
      duration: durationMs,
      panelClass: [PANEL, 'app-feedback-snackbar--success'],
      verticalPosition: 'bottom',
      horizontalPosition: 'center',
    });
  }
}
