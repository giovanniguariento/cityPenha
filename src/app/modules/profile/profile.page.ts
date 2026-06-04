import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Destroyable } from '../../shared/utils/destroyable';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { ProfilePageHeaderComponent } from '../../shared/components/profile-page-header/profile-page-header.component';
import { AuthService } from '../../shared/services/auth.service';
import { UserStateService } from '../../core/state/user-state.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { catchError, distinctUntilChanged, of, switchMap, takeUntil, tap } from 'rxjs';
import {
  User,
  UserStat,
  BackendUser,
  UserMePayload,
  MissionApiItem,
  BadgeApiItem,
} from '../../shared/interface/home.interface';
import { HomeService } from '../home/services/home.service';
import { MissionFeedbackService } from '../../shared/services/mission-feedback.service';
import { apiErrorMessage } from '../../shared/utils/api-error-message';

type ProfileTab = 'geral' | 'missoes' | 'loja';

@Component({
  selector: 'app-profile',
  imports: [NavComponent, CommonModule, RouterLink, ProfilePageHeaderComponent],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage extends Destroyable implements AfterViewInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly userState = inject(UserStateService);
  private readonly homeService = inject(HomeService);
  private readonly missionFeedback = inject(MissionFeedbackService);
  private readonly cdr = inject(ChangeDetectorRef);
  private static readonly XP_ICON = 'assets/xp-icon.svg';
  private static readonly MISSION_ICON = 'assets/mission-icon.svg';

  /** Lado do viewBox SVG do anel — deve bater com o `.avatar-wrapper` em px. */
  private static readonly RING_SIZE = 160;
  /** Raio dos cantos arredondados (squircle) — deve bater com o SCSS. */
  private static readonly RING_RADIUS = 28;
  /** Inset do stroke dentro do viewBox (para evitar clipping). */
  private static readonly RING_INSET = 4;

  @ViewChild('levelBadge', { static: false })
  private levelBadgeRef?: ElementRef<HTMLElement>;
  @ViewChild('avatarWrapper', { static: false })
  private avatarWrapperRef?: ElementRef<HTMLElement>;

  /** Largura medida da tag "Nível N" relativa ao avatar (em unidades do viewBox 0–160). */
  private readonly badgeWidthVb = signal<number>(64);

  /** `d` do caminho do anel de progresso — começa na borda esquerda da tag e termina na direita. */
  readonly progressPath = computed<string>(() => {
    const size = ProfilePage.RING_SIZE;
    const r = ProfilePage.RING_RADIUS;
    const inset = ProfilePage.RING_INSET;
    const half = Math.max(8, Math.min(size / 2 - r - 2, this.badgeWidthVb() / 2));
    const startX = size / 2 - half;
    const endX = size / 2 + half;
    const bottom = size - inset;
    const top = inset;
    const left = inset;
    const right = size - inset;
    // Sentido horário a partir da borda esquerda da tag.
    return [
      `M ${startX} ${bottom}`,
      `H ${left + r}`,
      `A ${r} ${r} 0 0 1 ${left} ${bottom - r}`,
      `V ${top + r}`,
      `A ${r} ${r} 0 0 1 ${left + r} ${top}`,
      `H ${right - r}`,
      `A ${r} ${r} 0 0 1 ${right} ${top + r}`,
      `V ${bottom - r}`,
      `A ${r} ${r} 0 0 1 ${right - r} ${bottom}`,
      `H ${endX}`,
    ].join(' ');
  });

  user = signal<User>({
    name: '',
    about: '',
    level: 1,
    avatarUrl: '',
  });

  /**
   * Progresso (0–100) do nível atual até o próximo nível.
   * Atualizado a partir de `levelProgress.percentage` em GET /user/me.
   * Mantém um valor inicial simbólico enquanto a API não responde.
   */
  readonly levelProgress = signal<number>(60);
  readonly activeTab = signal<ProfileTab>('geral');
  readonly missions = signal<MissionApiItem[]>([]);
  readonly badges = signal<BadgeApiItem[]>([]);
  readonly medalSlots = computed(() => {
    const maxSlots = 4;
    const list = this.badges()
      .filter((badge) => badge.earned)
      .slice(0, maxSlots);
    return Array.from({ length: maxSlots }, (_, index) => list[index] ?? null);
  });

  stats: UserStat[] = [];

  /** True while GET /user/me is in flight (utilizador Firebase autenticado). */
  readonly apiLoading = signal(false);
  readonly apiError = signal<string | null>(null);

  constructor() {
    super();

    // Re-mede a largura da tag sempre que o nível (e, portanto, o texto) muda.
    effect(() => {
      // Ler o nível para criar a dependência reativa.
      void this.user().level;
      this.measureBadge();
    });

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
        this.missionFeedback.seed(payload.missions);
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
      { value: String(completedMissionsCount), label: missionsLabel, icon: ProfilePage.MISSION_ICON, color: '#ff3b30' },
      { value: String(u.xp ?? 0), label: 'Total de XP', icon: ProfilePage.XP_ICON, color: '#ff3b30' },
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
      about: u.about != null ? String(u.about).trim() : '',
      level: res.level?.levelNumber ?? current.level,
    }));
    const missionsCount = Number(res.completedMissionsCount ?? 0);
    this.stats = this.buildStats(u, missionsCount);
    this.missions.set(res.missions ?? []);
    this.badges.set(res.badges ?? []);
    this.levelProgress.set(this.computeLevelProgress(res));
  }

  /**
   * Calcula % (0–100) para a barra de progresso em volta da foto.
   * Usa exclusivamente `levelProgress.percentage` (novo contrato da API).
   */
  private computeLevelProgress(res: UserMePayload): number {
    const directPercentage = Number(res.levelProgress?.percentage);
    if (Number.isFinite(directPercentage)) {
      return Math.max(0, Math.min(100, Math.round(directPercentage)));
    }
    return 0;
  }

  // helper used by template to decide if icon is an asset path
  isAssetIcon(icon?: string): boolean {
    return !!icon && (icon.startsWith('assets/') || icon.startsWith('/assets/'));
  }

  hasBadgeImage(badge: BadgeApiItem | null): badge is BadgeApiItem {
    return !!badge?.iconUrl;
  }

  badgeInitial(badge: BadgeApiItem | null): string {
    if (!badge?.title) return '?';
    return badge.title.trim().charAt(0).toUpperCase() || '?';
  }

  setTab(tab: ProfileTab): void {
    this.activeTab.set(tab);
  }

  progressPercent(mission: MissionApiItem): number {
    if (!mission.target) {
      return 0;
    }
    return Math.max(0, Math.min(100, Math.round((mission.progress / mission.target) * 100)));
  }

  ngAfterViewInit(): void {
    this.measureBadge();
  }

  @HostListener('window:resize')
  onResize(): void {
    this.measureBadge();
  }

  /**
   * Mede a largura da tag "Nível" relativa ao avatar e projeta para o viewBox 0–160
   * do SVG, de modo que os extremos da barra fiquem exatamente nas bordas da tag
   * independente do número do nível (1, 10, 99...).
   */
  private measureBadge(): void {
    queueMicrotask(() => {
      const badge = this.levelBadgeRef?.nativeElement;
      const wrapper = this.avatarWrapperRef?.nativeElement;
      if (!badge || !wrapper) return;
      const badgeW = badge.offsetWidth;
      const wrapperW = wrapper.offsetWidth || ProfilePage.RING_SIZE;
      if (!badgeW || !wrapperW) return;
      const vbWidth = (badgeW / wrapperW) * ProfilePage.RING_SIZE;
      this.badgeWidthVb.set(vbWidth);
      this.cdr.markForCheck();
    });
  }

  // teardown handled by Destroyable

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
