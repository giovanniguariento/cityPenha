import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { AdminMission } from '../../../../shared/interface/admin.interface';
import { AdminService } from '../../services/admin.service';

type StatusFilter = 'all' | 'active' | 'inactive';

@Component({
  selector: 'app-admin-missions-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './missions-list.page.html',
  styleUrl: './missions-list.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMissionsListPage {
  private readonly admin = inject(AdminService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly missions = signal<AdminMission[]>([]);
  readonly statusFilter = signal<StatusFilter>('all');
  readonly query = signal('');

  readonly filtered = computed(() => {
    const list = this.missions();
    const status = this.statusFilter();
    const q = this.query().trim().toLowerCase();
    return list.filter((m) => {
      if (status === 'active' && !m.isActive) return false;
      if (status === 'inactive' && m.isActive) return false;
      if (q) {
        const hay = `${m.key} ${m.title} ${m.category ?? ''} ${m.metricKey}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  readonly busyId = signal<string | null>(null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.admin
      .listMissions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.missions.set([...list].sort(this.sortByKey));
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar as missões.'));
        },
      });
  }

  private sortByKey(a: AdminMission, b: AdminMission): number {
    if (a.isActive !== b.isActive) return a.isActive ? -1 : 1;
    return a.key.localeCompare(b.key);
  }

  setStatusFilter(value: StatusFilter): void {
    this.statusFilter.set(value);
  }

  setQuery(value: string): void {
    this.query.set(value);
  }

  toggleActive(m: AdminMission): void {
    if (this.busyId()) return;
    this.busyId.set(m.id);
    this.admin
      .updateMission(m.id, { isActive: !m.isActive })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.missions.update((list) =>
            list.map((it) => (it.id === updated.id ? updated : it)).sort(this.sortByKey)
          );
          this.busyId.set(null);
          this.feedback.showSuccess(updated.isActive ? 'Missão ativada' : 'Missão desativada');
        },
        error: (err) => {
          this.busyId.set(null);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível atualizar a missão.'));
        },
      });
  }

  remove(m: AdminMission): void {
    if (this.busyId()) return;
    const ok = window.confirm(
      `Excluir a missão "${m.title}"? Isso remove o histórico de progresso de todos os usuários.`
    );
    if (!ok) return;
    this.busyId.set(m.id);
    this.admin
      .deleteMission(m.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.missions.update((list) => list.filter((it) => it.id !== m.id));
          this.busyId.set(null);
          this.feedback.showSuccess('Missão excluída');
        },
        error: (err) => {
          this.busyId.set(null);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível excluir a missão.'));
        },
      });
  }
}
