import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, signal } from '@angular/core';
import { Destroyable } from '../../shared/utils/destroyable';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../shared/services/auth.service';
import { UserStateService } from '../../core/state/user-state.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { catchError, distinctUntilChanged, of, switchMap, takeUntil, tap } from 'rxjs';
import { User, UserStat, BackendUser, UserMePayload } from '../../shared/interface/home.interface';
import { HomeService } from '../home/services/home.service';
import { apiErrorMessage } from '../../shared/utils/api-error-message';

@Component({
  selector: 'app-profile',
  imports: [NavComponent, CommonModule, RouterLink],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage extends Destroyable {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly userState = inject(UserStateService);
  private readonly homeService = inject(HomeService);
  private readonly cdr = inject(ChangeDetectorRef);
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

  /** True while GET /user/me is in flight (utilizador Firebase autenticado). */
  readonly apiLoading = signal(false);
  readonly apiError = signal<string | null>(null);

  constructor() {
    super();

    /**
     * Perfil no backend vem de GET /user/me (Bearer). Não depender só de `userId` no
     * localStorage — após login Firebase o token já basta; signup pode falhar sem gravar id.
     */
    this.userState.user$
      .pipe(
        tap((fbUser) => {
          this.user.update((current) => ({
            ...current,
            avatarUrl: fbUser?.photoURL || current.avatarUrl,
            name: fbUser?.displayName || current.name,
          }));
        }),
        distinctUntilChanged((a, b) => a?.uid === b?.uid),
        switchMap((fbUser) => {
          if (!fbUser) {
            this.stats = [];
            this.apiLoading.set(false);
            this.apiError.set(null);
            return of<UserMePayload | null>(null);
          }
          this.apiLoading.set(true);
          this.apiError.set(null);
          return this.homeService.getMe().pipe(
            catchError((err: unknown) => {
              this.apiError.set(apiErrorMessage(err, 'Não foi possível carregar os dados do perfil.'));
              return of<UserMePayload | null>(null);
            }),
            tap(() => this.apiLoading.set(false))
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe((payload) => {
        if (!payload?.user) {
          this.cdr.markForCheck();
          return;
        }
        this.apiError.set(null);
        this.applyMePayload(payload);
        if (payload.user.id) {
          this.userState.setUserIdToStorage(payload.user.id);
        }
        this.cdr.markForCheck();
      });
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

  private applyMePayload(res: UserMePayload): void {
    const u = res.user;
    this.user.update((current) => ({
      ...current,
      avatarUrl: u.photoUrl || current.avatarUrl,
      name: u.name || current.name,
      level: res.level?.levelNumber ?? current.level,
    }));
    const missionsCount = Number(res.completedMissionsCount ?? 0);
    this.stats = this.buildStats(u, missionsCount);
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
