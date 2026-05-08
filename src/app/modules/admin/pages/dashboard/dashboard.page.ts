import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { AdminService } from '../../services/admin.service';

interface DashboardStat {
  label: string;
  value: number | string;
  hint: string;
  link: string;
  cta: string;
}

interface QuickAction {
  label: string;
  description: string;
  link: string;
  icon: string;
  accent: 'brand' | 'amber' | 'blue';
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.page.html',
  styleUrl: './dashboard.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminDashboardPage {
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly missionsActive = signal(0);
  readonly missionsTotal = signal(0);
  readonly badgesActive = signal(0);
  readonly badgesTotal = signal(0);
  readonly levelsTotal = signal(0);
  readonly metricsTotal = signal(0);

  readonly quickActions: QuickAction[] = [
    {
      label: 'Nova missão',
      description: 'Crie uma missão dinâmica com critérios e recompensa.',
      link: '/admin/missions/new',
      icon: 'target',
      accent: 'brand',
    },
    {
      label: 'Nova insígnia',
      description: 'Conquista permanente baseada em métrica ou critério.',
      link: '/admin/badges/new',
      icon: 'medal',
      accent: 'amber',
    },
    {
      label: 'Novo level',
      description: 'Configure um patamar de progressão com recompensas.',
      link: '/admin/levels/new',
      icon: 'layers',
      accent: 'blue',
    },
  ];

  constructor() {
    forkJoin({
      missions: this.admin.listMissions().pipe(catchError(() => of(null))),
      badges: this.admin.listBadges().pipe(catchError(() => of(null))),
      levels: this.admin.listLevels().pipe(catchError(() => of(null))),
      metrics: this.admin.getMetrics().pipe(catchError(() => of(null))),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ missions, badges, levels, metrics }) => {
          this.missionsTotal.set(missions?.length ?? 0);
          this.missionsActive.set(missions?.filter((m) => m.isActive).length ?? 0);
          this.badgesTotal.set(badges?.length ?? 0);
          this.badgesActive.set(badges?.filter((b) => b.isActive).length ?? 0);
          this.levelsTotal.set(levels?.length ?? 0);
          this.metricsTotal.set(metrics?.length ?? 0);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar o resumo.'));
        },
      });
  }
}
