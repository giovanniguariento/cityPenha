import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserMePayload } from '../../../../shared/interface/home.interface';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-recompute',
  standalone: true,
  imports: [],
  templateUrl: './recompute.page.html',
  styleUrl: './recompute.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRecomputePage {
  private readonly admin = inject(AdminService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userId = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<UserMePayload | null>(null);

  setUserId(value: string): void {
    this.userId.set(value);
  }

  run(): void {
    const uid = this.userId().trim();
    if (!uid) {
      this.feedback.showError('Informe o userId.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.admin
      .recompute(uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (payload) => {
          this.loading.set(false);
          this.result.set(payload);
          this.feedback.showSuccess('Usuário recomputado.');
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível recomputar o usuário.'));
        },
      });
  }

  completedMissions(payload: UserMePayload | null): number {
    return payload?.completedMissionsCount ?? 0;
  }

  badgesGained(): number {
    // O snapshot atual de /user/me não inclui badges; mostramos só missions/level.
    return 0;
  }
}
