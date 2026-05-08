import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminLevel } from '../../../../shared/interface/admin.interface';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-levels-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './levels-list.page.html',
  styleUrl: './levels-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLevelsListPage {
  private readonly admin = inject(AdminService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly levels = signal<AdminLevel[]>([]);
  readonly busyId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin
      .listLevels()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.levels.set(
            [...list].sort((a, b) => a.levelNumber - b.levelNumber)
          );
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar os levels.'));
        },
      });
  }

  remove(l: AdminLevel): void {
    if (this.busyId() || !l.id) return;
    const ok = window.confirm(
      `Excluir o nível ${l.levelNumber}? Recompensas já concedidas (LEVEL_UP) permanecem no ledger.`
    );
    if (!ok) return;
    this.busyId.set(l.id);
    this.admin
      .deleteLevel(l.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.levels.update((list) => list.filter((it) => it.id !== l.id));
          this.busyId.set(null);
          this.feedback.showSuccess('Level excluído');
        },
        error: (err) => {
          this.busyId.set(null);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível excluir o level.'));
        },
      });
  }
}
