import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { HomeService } from '../home/services/home.service';
import { MissionApiItem } from '../../shared/interface/home.interface';
import { MissionFeedbackService } from '../../shared/services/mission-feedback.service';

export interface Mission {
  id: string;
  key: string;
  title: string;
  description: string;
  target: number;
  coinReward: number;
  xpReward: number;
  progress: number;
  completed: boolean;
  completedAt: string | null;
  icon: 'article' | 'globe' | 'bookmark' | 'profile';
  route: string;
}

function apiMissionToMission(item: MissionApiItem): Mission {
  const key = item.key.toLowerCase();
  const description = item.description ?? '';
  let icon: Mission['icon'] = 'article';
  let route = '/home';
  if (key.includes('read_7_days') || key.includes('frequen')) {
    icon = 'globe';
    route = '/frequencia';
  } else if (key.includes('read_') || key.includes('post')) {
    icon = 'article';
    route = '/home';
  } else if (key.includes('save') || key.includes('bookmark')) {
    icon = 'bookmark';
    route = '/favorites';
  } else if (key.includes('profile') || key.includes('perfil')) {
    icon = 'profile';
    route = '/profile';
  }
  return {
    id: item.id,
    key: item.key,
    title: item.title,
    description,
    target: item.target,
    coinReward: item.coinReward,
    xpReward: item.xpReward,
    progress: item.progress,
    completed: item.completed,
    completedAt: item.completedAt,
    icon,
    route,
  };
}

@Component({
  selector: 'app-missions',
  standalone: true,
  imports: [RouterLink, NavComponent],
  templateUrl: './missions.page.html',
  styleUrl: './missions.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionsPage implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly missionFeedback = inject(MissionFeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly badgeName = 'Novo explorador';
  readonly missions = signal<Mission[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.homeService
      .getMissions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (missions) => {
        this.loading.set(false);
        if (Array.isArray(missions) && missions.length > 0) {
          this.missionFeedback.seed(missions);
          this.missions.set(missions.map(apiMissionToMission));
        } else {
          this.missionFeedback.seed(missions);
          this.missions.set([]);
        }
        this.error.set(null);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar as missões.');
      },
    });
  }
}
