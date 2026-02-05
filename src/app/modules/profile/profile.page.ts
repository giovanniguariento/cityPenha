import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Destroyable } from '../../shared/utils/destroyable';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { AuthService } from '../../shared/services/auth.service';
import { UserStateService } from '../../core/state/user-state.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs';
import { User, UserStat, BackendUser, GetUserResponse } from '../../shared/interface/home.interface';
import { HomeService } from '../home/services/home.service';

@Component({
  selector: 'app-profile',
  imports: [NavComponent, CommonModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage extends Destroyable {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly userState = inject(UserStateService);
  private readonly homeService = inject(HomeService);
  private static readonly XP_ICON = 'assets/xp-icon.svg';
  private static readonly MISSION_ICON = 'assets/mission-icon.svg';

  user = signal<User>({
    name: 'Júlia Guimarães',
    role: 'Redatora & RP',
    description: 'Narrativas que conectam e encantam.',
    level: 5,
    avatarUrl: 'https://i.pravatar.cc/150?img=5'
  });

  stats: UserStat[] = [];

  constructor() {
    super();

    // sync firebase profile info (avatar/name) via centralized user state
    this.userState.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((fbUser) => {
        this.user.update(current => ({
          ...current,
          avatarUrl: fbUser?.photoURL || current.avatarUrl,
          name: fbUser?.displayName || current.name
        }));
      });

    // load backend user details (id stored at login)
    const storedId = this.userState.getUserIdFromStorage();
    if (storedId) {
      this.fetchAndApplyUser(storedId);
    }
  }

  // localStorage access moved to UserStateService

  private formatDateBR(date?: string | null): string {
    if (!date) return '—';
    try {
      return new Date(date).toLocaleDateString('pt-BR');
    } catch {
      return '—';
    }
  }

  private buildStats(u: BackendUser, completedMissionsCount: number): UserStat[] {
    const missionsLabel = completedMissionsCount === 1 ? 'Missão' : 'Missões';

    return [
      { value: String(u.xp ?? 0), label: 'Total de XP', icon: ProfilePage.XP_ICON, color: '#ff3b30' },
      { value: String(completedMissionsCount), label: missionsLabel, icon: ProfilePage.MISSION_ICON, color: '#ff3b30' },
      { value: String(u.coins ?? 0), label: 'Moedas', icon: '🪙', color: '#ff3b30' },
      { value: this.formatDateBR(u.createdAt), label: 'Membro desde', icon: '📅', color: '#ff3b30' }
    ];
  }

  private fetchAndApplyUser(id: string): void {
    this.homeService.getUser(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: GetUserResponse) => {
          if (!res?.success || !res.data?.user) return;
          const u = res.data.user;

          // update visible user fields
          this.user.update(current => ({
            ...current,
            avatarUrl: u.photoUrl || current.avatarUrl,
            name: u.name || current.name
          }));

          const missionsCount = Number(res.data.completedMissionsCount ?? 0);
          this.stats = this.buildStats(u, missionsCount);
        },
        error: () => {
          // silent fail - keep defaults
        }
      });
  }

  // helper used by template to decide if icon is an asset path
  isAssetIcon(icon?: string): boolean {
    return !!icon && (icon.startsWith('assets/') || icon.startsWith('/assets/'));
  }

  // teardown handled by Destroyable

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
