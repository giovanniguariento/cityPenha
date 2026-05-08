import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HomeService } from '../home/services/home.service';
import { DomSanitizer } from '@angular/platform-browser';
import { EMPTY, switchMap, take, takeUntil, tap } from 'rxjs';
import { PostDetail } from '../../shared/interface/home.interface';
import { Destroyable } from '../../shared/utils/destroyable';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { FeedbackService } from '../../shared/services/feedback.service';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { LoginRequiredDialogComponent } from '../../shared/components/login-required-dialog/login-required-dialog.component';
import { ReadRewardToastComponent } from '../../shared/components/read-reward-toast/read-reward-toast.component';
import { MissionFeedbackService } from '../../shared/services/mission-feedback.service';
import { DecodeHtmlEntitiesPipe } from '../../shared/pipes/decode-html-entities.pipe';
import { NewsSkeletonComponent } from '../../shared/components/news-skeleton/news-skeleton.component';
import { Auth } from '@angular/fire/auth';
import { animate, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-news-page',
  imports: [
    RouterLink,
    CommonModule,
    LoginRequiredDialogComponent,
    MatSnackBarModule,
    ReadRewardToastComponent,
    DecodeHtmlEntitiesPipe,
    NewsSkeletonComponent,
  ],
  templateUrl: './news.page.html',
  styleUrl: './news.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [
    trigger('floatingNav', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px)' }),
        animate(
          '280ms cubic-bezier(0.22, 1, 0.36, 1)',
          style({ opacity: 1, transform: 'translateY(0)' })
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms cubic-bezier(0.4, 0, 1, 1)',
          style({ opacity: 0, transform: 'translateY(6px)' })
        ),
      ]),
    ]),
  ],
})
export class NewsPageComponent extends Destroyable implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  /** Coalesces scroll events to at most one DOM update per animation frame. */
  private scrollRafId = 0;
  private scrollHandler?: () => void;
  private readSentForPost = new Set<number>();
  // Tracks posts that currently have an in-flight "read" request
  private readPendingForPost = new Set<number>();
  // Tracks posts for which we've already attempted to mark-as-read (prevents repeated attempts)
  private readAttemptedForPost = new Set<number>();

  news = signal<PostDetail | null>(null);
  following = signal<boolean>(false);
  bookmarked = signal<boolean>(false);
  liked = signal<boolean>(false);
  likesCount = signal<number>(0);
  readingTime = signal<number>(0);
  // no local modal flag — use Material dialog
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly feedback = inject(FeedbackService);
  private readonly missionFeedback = inject(MissionFeedbackService);
  private readonly auth = inject(Auth);
  private dialogOpen = false;
  private firstRenderAt = 0;
  readonly likePending = signal(false);
  readonly savePending = signal(false);
  readonly loadingPost = signal(true);
  readonly loadError = signal<string | null>(null);
  /** Compact back/share bar when the hero header is off-screen. */
  readonly floatingNavVisible = signal(false);
  /** Brief “thank you” line after the user likes (auto-dismiss). */
  readonly likeFeedbackThankYou = signal(false);
  /** Browser `setTimeout` id (number); avoids Node `Timeout` vs DOM mismatch in typings. */
  private likeThankYouClearTimer: number | null = null;

  constructor() {
    super();
    this.activatedRoute.params
      .pipe(
        tap(() => {
          this.loadingPost.set(true);
          this.loadError.set(null);
          this.news.set(null);
          this.floatingNavVisible.set(false);
          this.clearLikeThankYouTimer();
          this.likeFeedbackThankYou.set(false);
        }),
        switchMap((params) => this.homeService.getPost(params['slug'])),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (post) => {
          const sanitizedPost: PostDetail = {
            ...post,
            content: typeof post.content === 'string'
              ? this.sanitizer.bypassSecurityTrustHtml(post.content)
              : post.content
          };
          this.loadingPost.set(false);
          this.loadError.set(null);
          this.news.set(sanitizedPost);
          this.applyLikeStateFromGetPost(sanitizedPost);
          this.applyBookmarkStateFromGetPost(sanitizedPost);
          this.likePending.set(false);
          this.savePending.set(false);
          this.firstRenderAt = Date.now();
          setTimeout(() => this.updateReadingProgress(), 0);
        },
        error: (err: unknown) => {
          this.loadingPost.set(false);
          this.loadError.set(apiErrorMessage(err, 'Não foi possível carregar a notícia.'));
        },
      });
  }

  ngOnInit(): void {
    this.scrollHandler = () => {
      if (this.scrollRafId) {
        return;
      }
      this.scrollRafId = requestAnimationFrame(() => {
        this.scrollRafId = 0;
        this.updateReadingProgress();
      });
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    // Calculate initial progress immediately (in case the page is already scrolled or content fits viewport)
    this.updateReadingProgress();
  }

  override ngOnDestroy(): void {
    if (this.scrollRafId) {
      cancelAnimationFrame(this.scrollRafId);
      this.scrollRafId = 0;
    }
    this.clearLikeThankYouTimer();
    // call base teardown for destroy$
    super.ngOnDestroy();
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }

  private clearLikeThankYouTimer(): void {
    if (this.likeThankYouClearTimer != null) {
      clearTimeout(this.likeThankYouClearTimer);
      this.likeThankYouClearTimer = null;
    }
  }

  /** Shows “Obrigado pelo feedback!” for a few seconds after a successful like gesture. */
  private scheduleLikeThankYou(durationMs = 4000): void {
    this.clearLikeThankYouTimer();
    this.likeFeedbackThankYou.set(true);
    this.likeThankYouClearTimer = window.setTimeout(() => {
      this.likeFeedbackThankYou.set(false);
      this.likeThankYouClearTimer = null;
    }, durationMs);
  }

  /**
   * Compute reading progress based on document scroll position and height.
   * Called on scroll and after content is rendered to ensure an accurate initial value.
   */
  private updateReadingProgress(): void {
    const winScroll = (window.pageYOffset ?? document.documentElement.scrollTop ?? document.body.scrollTop ?? 0) as number;
    const doc = document.documentElement;
    const height = doc.scrollHeight - doc.clientHeight;

    let scrolled = 0;
    // If there's no overflow (content fits viewport) consider it fully read.
    if (height <= 0) {
      scrolled = 100;
    } else {
      scrolled = (winScroll / height) * 100;
      if (height - winScroll <= 60) {
        scrolled = 100;
      }
    }

    this.readingTime.set(Math.min(100, Math.max(0, scrolled)));

    const post = this.news();
    const scrollThreshold = post?.onlyVideo
      ? 100
      : Math.max(120, Math.round(window.innerHeight * 0.47));
    this.floatingNavVisible.set(Boolean(post) && winScroll >= scrollThreshold);

    if (this.readingTime() >= 100) {
      if (post && !this.readAttemptedForPost.has(post.id)) {
        // avoid immediately triggering on initial render when content fits viewport
        const winScroll = (window.pageYOffset ?? document.documentElement.scrollTop ?? document.body.scrollTop ?? 0) as number;
        const TIME_THRESHOLD_MS = 700;
        const sinceRender = Date.now() - (this.firstRenderAt || 0);
        // require either the user has scrolled, or a brief time has passed since render
        if (winScroll > 0 || sinceRender > TIME_THRESHOLD_MS) {
          this.readAttemptedForPost.add(post.id);
          this.tryMarkAsRead();
        }
      }
    }
  }

  async share(): Promise<void> {
    if (!navigator.share) {
      return;
    }

    try {
      const shareData = {
        title: 'Acesse o CityPenha',
        text: 'Veja agora essa noticia',
        url: window.location.href,
      };
      await navigator.share(shareData);
    } catch (error) {
      // User cancelled or error occurred - silently fail
      if (error instanceof Error && error.name !== 'AbortError') {
        // Could log to error service in production
      }
    }
  }

  private tryMarkAsRead(): void {
    const post = this.news();
    if (!post || typeof post.id !== 'number') {
      return;
    }

    // Already marked as read
    if (this.readSentForPost.has(post.id)) {
      return;
    }

    // Already sending a request for this post
    if (this.readPendingForPost.has(post.id)) {
      return;
    }

    // Check login status via Firebase Auth. If the user is not authenticated,
    // show a lightweight modal explaining the points reward.
    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      this.maybeShowEarnPointsModal(post);
      return;
    }

    this.readPendingForPost.add(post.id);
    this.homeService
      .markPostRead(post.id, post.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          // Mark locally so we don't re-send for this post.
          this.readSentForPost.add(post.id);
          this.readPendingForPost.delete(post.id);

          this.homeService.invalidateHomeFeedCache();

          if (res && 'already' in res && res.already) {
            return;
          }

          const hadNewMission = this.missionFeedback.handleMissionsUpdate(res.missions);

          // Toast de leitura: só se não celebrámos já uma missão nesta mesma resposta.
          if (hadNewMission) {
            return;
          }

          try {
            this.snackBar.openFromComponent(ReadRewardToastComponent, {
              data: { points: 10 },
              duration: 4000,
              horizontalPosition: 'right',
              verticalPosition: 'bottom',
              panelClass: ['read-reward-snackbar']
            });
          } catch {
            this.snackBar.open('Você recebeu 10 pontos! 🎉', 'Fechar', { duration: 4000, panelClass: ['read-reward-snackbar'], verticalPosition: 'bottom' });
          }
        },
        error: (err: unknown) => {
          this.readPendingForPost.delete(post.id);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível registrar a leitura.'));
        }
      });
  }

  private maybeShowEarnPointsModal(post: PostDetail) {
    // Guard: avoid opening multiple dialogs at once.
    if (this.dialogOpen) {
      return;
    }
    this.dialogOpen = true;
    const dialogRef = this.dialog.open(LoginRequiredDialogComponent, {
      data: { postId: post.id, points: 10 }
    });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.dialogOpen = false;
    });
  }


  private openLoginDialogWithAction(post: PostDetail, actionLabel: string, points = 10) {
    if (this.dialogOpen) {
      return;
    }
    this.dialogOpen = true;
    const dialogRef = this.dialog.open(LoginRequiredDialogComponent, {
      data: { postId: post.id, points, actionLabel }
    });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe((result) => {
      this.dialogOpen = false;
      if (result === 'login') {
        // user chose to login; navigation is handled by the dialog
      }
    });
  }

  /** Estado de curtida vindo do GET /post/:slug (Bearer opcional). */
  private applyLikeStateFromGetPost(post: PostDetail): void {
    const liked = Boolean(post.liked);
    const likesCount = typeof post.likesCount === 'number' ? post.likesCount : 0;
    this.liked.set(liked);
    this.likesCount.set(likesCount);
    this.news.update((n) =>
      n && n.id === post.id ? { ...n, liked, likesCount } : n
    );
  }

  /** Salvo na pasta "Salvos" quando `savedFolderIds` inclui a pasta default_saved. */
  private applyBookmarkStateFromGetPost(post: PostDetail): void {
    const ids = post.savedFolderIds;
    if (!ids?.length) {
      this.bookmarked.set(false);
      return;
    }
    this.homeService
      .getDefaultSavedFolderId()
      .pipe(takeUntil(this.destroy$))
      .subscribe((folderId) => {
        this.bookmarked.set(folderId ? ids.includes(folderId) : false);
      });
  }

  onFollowClick() {
    const firebaseUser = this.auth.currentUser;
    const post = this.news();
    if (firebaseUser) {
      this.following.set(!this.following());
    } else if (post) {
      this.openLoginDialogWithAction(post, 'seguir este autor', 5);
    }
  }

  onListenClick() {
    const firebaseUser = this.auth.currentUser;
    const post = this.news();
    if (firebaseUser) {
      // If you have audio player integration, trigger it here.
      // fallback: do nothing
    } else if (post) {
      this.openLoginDialogWithAction(post, 'ouvir o conteúdo', 2);
    }
  }

  onSaveClick() {
    const firebaseUser = this.auth.currentUser;
    const post = this.news();
    if (!firebaseUser) {
      if (post) {
        this.openLoginDialogWithAction(post, 'salvar esta notícia', 10);
      }
      return;
    }

    if (!post || typeof post.id !== 'number') {
      return;
    }
    if (this.savePending()) {
      return;
    }

    const wordpressPostId = post.id;
    const willBookmark = !this.bookmarked();

    const previousBookmarked = this.bookmarked();
    this.bookmarked.set(willBookmark);
    this.savePending.set(true);

    this.homeService
      .getDefaultSavedFolderId()
      .pipe(
        take(1),
        switchMap((folderId) => {
          if (!folderId) {
            this.savePending.set(false);
            this.bookmarked.set(previousBookmarked);
            this.feedback.showError('Não foi possível encontrar a pasta de salvos.');
            return EMPTY;
          }
          return willBookmark
            ? this.homeService.addPostToFolder(folderId, wordpressPostId)
            : this.homeService.removePostFromFolder(folderId, wordpressPostId);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (res) => {
          this.savePending.set(false);
          this.missionFeedback.handleMissionsUpdate(res.missions);
        },
        error: (err: unknown) => {
          this.savePending.set(false);
          if (this.news()?.id === post.id) {
            this.bookmarked.set(previousBookmarked);
          }
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível atualizar os salvos.'));
        },
      });
  }

  onLikeClick() {
    const firebaseUser = this.auth.currentUser;
    const post = this.news();
    if (firebaseUser) {
      if (!post) {
        return;
      }
      if (this.likePending()) {
        return;
      }

      const targetPostId = post.id;
      const previousLiked = this.liked();
      const previousLikesCount = this.likesCount();
      const willLike = !previousLiked;
      // Instant heart toggle (same UX as before); server response confirms/adjusts.
      this.liked.set(willLike);
      this.likesCount.set(Math.max(0, previousLikesCount + (previousLiked ? -1 : 1)));
      if (willLike) {
        this.scheduleLikeThankYou();
      } else {
        this.clearLikeThankYouTimer();
        this.likeFeedbackThankYou.set(false);
      }

      this.likePending.set(true);
      this.homeService
        .togglePostLike(post.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            this.likePending.set(false);
            if (this.news()?.id !== targetPostId) {
              return;
            }
            if (res == null || typeof res.liked !== 'boolean') {
              this.liked.set(previousLiked);
              this.likesCount.set(previousLikesCount);
              this.clearLikeThankYouTimer();
              this.likeFeedbackThankYou.set(false);
              return;
            }
            const liked = Boolean(res.liked);
            const likesCount = res.likesCount;
            this.liked.set(liked);
            this.likesCount.set(likesCount);
            if (!liked) {
              this.clearLikeThankYouTimer();
              this.likeFeedbackThankYou.set(false);
            }
            this.news.update((n) =>
              n && n.id === targetPostId ? { ...n, liked, likesCount } : n
            );
            const slug = post.slug;
            if (slug) {
              this.homeService.invalidatePostCache(slug);
            }
            this.missionFeedback.handleMissionsUpdate(res.missions);
          },
          error: (err: unknown) => {
            this.likePending.set(false);
            if (this.news()?.id !== targetPostId) {
              return;
            }
            this.liked.set(previousLiked);
            this.likesCount.set(previousLikesCount);
            this.clearLikeThankYouTimer();
            this.likeFeedbackThankYou.set(false);
            this.feedback.showError(apiErrorMessage(err, 'Não foi possível atualizar a curtida.'));
          }
        });
    } else if (post) {
      this.openLoginDialogWithAction(post, 'curtir esta notícia', 5);
    }
  }

  onMoreClick() {
    const post = this.news();
    // Always open the "more" menu for both logged and anonymous users.
    // We intentionally do NOT show the login-required dialog here.
    this.openMoreMenu();
  }

  private openMoreMenu() {
    // TODO: wire this to the actual "more" menu/action sheet in the app.
    // For now, it's a no-op placeholder to preserve existing behavior.
    // Example: this.actionSheetCtrl.create(...).then(sheet => sheet.present());
  }


}
