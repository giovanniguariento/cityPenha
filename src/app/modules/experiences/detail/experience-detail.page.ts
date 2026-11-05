import {
  ChangeDetectionStrategy,
  Component,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '@angular/fire/auth';
import { EMPTY, Subject, catchError, map, merge, switchMap, takeUntil } from 'rxjs';
import { NavComponent } from '../../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { DetailHeroComponent } from '../../../shared/components/detail-hero/detail-hero.component';
import { DetailSheetComponent } from '../../../shared/components/detail-sheet/detail-sheet.component';
import { XpBadgeComponent } from '../../../shared/components/xp-badge/xp-badge.component';
import { TagChipsComponent } from '../../../shared/components/tag-chips/tag-chips.component';
import { LoginRequiredDialogComponent } from '../../../shared/components/login-required-dialog/login-required-dialog.component';
import { ReadRewardToastComponent } from '../../../shared/components/read-reward-toast/read-reward-toast.component';
import { CommentsSectionComponent } from '../../news/components/comments/comments-section/comments-section.component';
import { Destroyable } from '../../../shared/utils/destroyable';
import { apiErrorMessage } from '../../../shared/utils/api-error-message';
import { FeedbackService } from '../../../shared/services/feedback.service';
import { MissionFeedbackService } from '../../../shared/services/mission-feedback.service';
import { ExperienceDetail } from '../../../shared/interface/experience.interface';
import { ExperienceService } from '../services/experience.service';
import { ExperienceEventMetaComponent } from '../components/experience-event-meta/experience-event-meta.component';
import { HomeService } from '../../home/services/home.service';

@Component({
  selector: 'app-experience-detail',
  imports: [
    RouterLink,
    NavComponent,
    LegalFooterComponent,
    DetailHeroComponent,
    DetailSheetComponent,
    XpBadgeComponent,
    TagChipsComponent,
    ExperienceEventMetaComponent,
    CommentsSectionComponent,
  ],
  templateUrl: './experience-detail.page.html',
  styleUrl: './experience-detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceDetailPage extends Destroyable {
  private readonly route = inject(ActivatedRoute);
  private readonly experienceService = inject(ExperienceService);
  private readonly feedback = inject(FeedbackService);
  private readonly missionFeedback = inject(MissionFeedbackService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(Auth);
  private readonly homeService = inject(HomeService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly retry$ = new Subject<void>();

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly experience = signal<ExperienceDetail | null>(null);
  readonly liked = signal(false);
  readonly likeCount = signal(0);
  readonly likePending = signal(false);
  readonly sharePending = signal(false);
  readonly likeThankYou = signal(false);
  readonly currentUserId = signal<string | null>(null);

  constructor() {
    super();

    if (this.auth.currentUser) {
      this.homeService
        .getMe()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (me) => this.currentUserId.set(me.user.id),
          error: () => this.currentUserId.set(null),
        });
    }

    const slug$ = merge(
      this.route.paramMap.pipe(map((params) => params.get('slug') ?? '')),
      this.retry$.pipe(map(() => this.route.snapshot.paramMap.get('slug') ?? '')),
    );

    slug$
      .pipe(
        switchMap((slug) => {
          this.loading.set(true);
          this.error.set(null);
          this.experience.set(null);
          this.liked.set(false);
          this.likeCount.set(0);
          this.likeThankYou.set(false);
          return this.experienceService.getBySlug(slug).pipe(
            catchError((err: unknown) => {
              this.loading.set(false);
              this.error.set(apiErrorMessage(err, 'Experiência não encontrada.'));
              return EMPTY;
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((detail) => {
        this.experience.set(detail);
        this.liked.set(detail.liked === true);
        this.likeCount.set(detail.likeCount ?? 0);
        this.loading.set(false);
        this.error.set(null);
      });
  }

  retry(): void {
    this.retry$.next();
  }

  onQrClick(): void {
    this.feedback.showComingSoon();
  }

  onLikeClick(): void {
    if (!this.auth.currentUser) {
      this.dialog.open(LoginRequiredDialogComponent, {
        data: { points: 5, actionLabel: 'curtir' },
      });
      return;
    }
    const exp = this.experience();
    if (!exp || this.likePending()) return;

    const prevLiked = this.liked();
    const prevCount = this.likeCount();
    const nextLiked = !prevLiked;
    this.liked.set(nextLiked);
    this.likeCount.set(Math.max(0, prevCount + (nextLiked ? 1 : -1)));
    this.likePending.set(true);

    this.experienceService
      .toggleLike(exp.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.likePending.set(false);
          this.liked.set(res.liked);
          this.likeCount.set(res.likeCount);
          if (res.missions) {
            this.missionFeedback.handleMissionsUpdate(res.missions as never);
          }
          const xp = res.rewards?.find((r) => r.source?.startsWith('EXPERIENCE_LIKE_XP'));
          if (xp && xp.xpDelta > 0) {
            this.showXpToast(xp.xpDelta);
            this.likeThankYou.set(true);
          }
        },
        error: (err: unknown) => {
          this.likePending.set(false);
          this.liked.set(prevLiked);
          this.likeCount.set(prevCount);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível registrar a curtida.'));
        },
      });
  }

  async share(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const exp = this.experience();
    const url = window.location.href;
    const shareData: ShareData = {
      title: exp?.title ?? 'CityPenha',
      text: exp?.description || 'Confira essa experiência no CityPenha',
      url,
    };

    let shared = false;
    if (navigator.share && (navigator.canShare == null || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData);
        shared = true;
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          shared = await this.fallbackCopyToClipboard(url);
        }
      }
    } else {
      shared = await this.fallbackCopyToClipboard(url);
    }

    if (shared) {
      await this.registerShareXp();
    }
  }

  private async registerShareXp(): Promise<void> {
    const exp = this.experience();
    if (!exp || !this.auth.currentUser || this.sharePending()) return;

    this.sharePending.set(true);
    this.experienceService
      .registerShare(exp.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.sharePending.set(false);
          if (res.missions) {
            this.missionFeedback.handleMissionsUpdate(res.missions as never);
          }
          const xp = res.rewards?.find((r) => r.source?.startsWith('EXPERIENCE_SHARE_XP'));
          if (xp && xp.xpDelta > 0) {
            this.showXpToast(xp.xpDelta);
          }
        },
        error: () => {
          this.sharePending.set(false);
        },
      });
  }

  private showXpToast(points: number): void {
    try {
      this.snackBar.openFromComponent(ReadRewardToastComponent, {
        data: { points },
        duration: 3500,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: ['read-reward-snackbar'],
      });
    } catch {
      this.feedback.showSuccess(`+${points} XP`);
    }
  }

  private async fallbackCopyToClipboard(url: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(url);
      this.snackBar.open('Link copiado!', '', { duration: 2500, verticalPosition: 'bottom' });
      return true;
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.snackBar.open('Link copiado!', '', { duration: 2500, verticalPosition: 'bottom' });
      return true;
    }
  }
}
