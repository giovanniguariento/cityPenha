import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminBadge } from '../../../../shared/interface/admin.interface';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { AdminService } from '../../services/admin.service';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-admin-badges-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './badges-list.page.html',
  styleUrl: './badges-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBadgesListPage {
  private readonly admin = inject(AdminService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly badges = signal<AdminBadge[]>([]);
  readonly statusFilter = signal<StatusFilter>('all');
  readonly query = signal('');
  readonly busyId = signal<string | null>(null);

  readonly filtered = computed(() => {
    const list = this.badges();
    const status = this.statusFilter();
    const q = this.query().trim().toLowerCase();
    return list.filter((b) => {
      if (status === 'active' && !b.isActive) return false;
      if (status === 'inactive' && b.isActive) return false;
      if (q) {
        const hay = `${b.key} ${b.title} ${b.metricKey ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin
      .listBadges()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.badges.set([...list].sort(this.sortByKey));
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar as insígnias.'));
        },
      });
  }

  private sortByKey(a: AdminBadge, b: AdminBadge): number {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.key.localeCompare(b.key);
  }

  setStatusFilter(value: StatusFilter): void {
    this.statusFilter.set(value);
  }

  setQuery(value: string): void {
    this.query.set(value);
  }

  toggleActive(b: AdminBadge): void {
    if (this.busyId()) return;
    this.busyId.set(b.id);
    this.admin
      .updateBadge(b.id, { isActive: !b.isActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.badges.update((list) =>
            list.map((it) => (it.id === updated.id ? updated : it)).sort(this.sortByKey)
          );
          this.busyId.set(null);
          this.feedback.showSuccess(updated.isActive ? 'Insígnia ativada' : 'Insígnia desativada');
        },
        error: (err) => {
          this.busyId.set(null);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível atualizar a insígnia.'));
        },
      });
  }

  remove(b: AdminBadge): void {
    if (this.busyId()) return;
    const ok = window.confirm(
      `Excluir a insígnia "${b.title}"? Recomenda-se usar Desativar em vez de excluir.`
    );
    if (!ok) return;
    this.busyId.set(b.id);
    this.admin
      .deleteBadge(b.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.badges.update((list) => list.filter((it) => it.id !== b.id));
          this.busyId.set(null);
          this.feedback.showSuccess('Insígnia excluída');
        },
        error: (err) => {
          this.busyId.set(null);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível excluir a insígnia.'));
        },
      });
  }
}
