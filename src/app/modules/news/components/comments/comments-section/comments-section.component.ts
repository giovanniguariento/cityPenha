import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  Input,
  OnInit,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Auth } from '@angular/fire/auth';
import { takeUntil } from 'rxjs';
import { CommentView } from '../../../../../shared/interface/home.interface';
import { CommentService } from '../../../services/comment.service';
import { HomeService } from '../../../../home/services/home.service';
import { FeedbackService } from '../../../../../shared/services/feedback.service';
import { MissionFeedbackService } from '../../../../../shared/services/mission-feedback.service';
import { AuthService } from '../../../../../shared/services/auth.service';
import { Destroyable } from '../../../../../shared/utils/destroyable';
import { apiErrorMessage } from '../../../../../shared/utils/api-error-message';
import { ReadRewardToastComponent } from '../../../../../shared/components/read-reward-toast/read-reward-toast.component';
import { LoginRequiredDialogComponent } from '../../../../../shared/components/login-required-dialog/login-required-dialog.component';
import { ConfirmDialogComponent } from '../../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CommentItemComponent } from '../comment-item/comment-item.component';
import { CommentInputComponent } from '../comment-input/comment-input.component';

@Component({
  selector: 'app-comments-section',
  standalone: true,
  imports: [
    CommonModule,
    MatSnackBarModule,
    MatDialogModule,
    CommentItemComponent,
    CommentInputComponent,
  ],
  templateUrl: './comments-section.component.html',
  styleUrl: './comments-section.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentsSectionComponent extends Destroyable implements OnInit {
  @Input({ required: true }) wordpressPostId!: number;
  @Input() currentUserId: string | null = null;
  readonly pastArticleStart = input(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly commentService = inject(CommentService);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);
  private readonly missionFeedback = inject(MissionFeedbackService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(Auth);
  private readonly authService = inject(AuthService);
  private dialogOpen = false;

  readonly commentsSectionRoot = viewChild<ElementRef<HTMLElement>>('commentsSectionRoot');

  readonly isAuthenticated = signal(false);
  readonly comments = signal<CommentView[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly replyingTo = signal<CommentView | null>(null);
  readonly lastDeletedCommentId = signal<string | null>(null);
  readonly commentsSectionInView = signal(false);
  readonly showFloatingComposer = computed(
    () => this.pastArticleStart() && !this.commentsSectionInView()
  );
  /** Keeps fixed positioning active through the exit transition. */
  readonly composerFixedActive = signal(false);
  readonly composerLeaving = signal(false);
  readonly composerDockingIn = signal(false);
  private composerLeaveTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly COMPOSER_LEAVE_MS = 420;
  private static readonly COMPOSER_DOCK_IN_MS = 280;

  constructor() {
    super();

    effect((onCleanup) => {
      const shouldFloat = this.showFloatingComposer();

      if (this.composerLeaveTimer != null) {
        clearTimeout(this.composerLeaveTimer);
        this.composerLeaveTimer = null;
      }

      if (shouldFloat) {
        this.composerLeaving.set(false);
        this.composerDockingIn.set(false);
        this.composerFixedActive.set(true);
        return;
      }

      if (!this.composerFixedActive()) {
        return;
      }

      this.composerLeaving.set(true);
      this.composerLeaveTimer = setTimeout(
        () => this.finishComposerLeave(),
        CommentsSectionComponent.COMPOSER_LEAVE_MS
      );

      onCleanup(() => {
        if (this.composerLeaveTimer != null) {
          clearTimeout(this.composerLeaveTimer);
          this.composerLeaveTimer = null;
        }
      });
    });

    effect((onCleanup) => {
      if (!isPlatformBrowser(this.platformId)) {
        return;
      }

      const root = this.commentsSectionRoot()?.nativeElement;
      if (!root) {
        return;
      }

      const observer = new IntersectionObserver(
        ([entry]) => this.commentsSectionInView.set(entry.isIntersecting),
        { threshold: 0 }
      );
      observer.observe(root);
      onCleanup(() => observer.disconnect());
    });
  }

  ngOnInit(): void {
    this.isAuthenticated.set(!!this.auth.currentUser);
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => this.isAuthenticated.set(!!user));

    this.loadComments();
  }

  override ngOnDestroy(): void {
    this.clearComposerLeaveTimer();
    super.ngOnDestroy();
  }

  onComposerAnimationEnd(event: AnimationEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    if (event.animationName === 'composer-leave' && this.composerLeaving()) {
      this.clearComposerLeaveTimer();
      this.finishComposerLeave();
      return;
    }

    if (event.animationName === 'composer-dock-in') {
      this.composerDockingIn.set(false);
    }
  }

  private finishComposerLeave(): void {
    this.composerFixedActive.set(false);
    this.composerLeaving.set(false);
    this.composerDockingIn.set(true);
    this.composerLeaveTimer = null;

    setTimeout(() => {
      if (this.composerDockingIn()) {
        this.composerDockingIn.set(false);
      }
    }, CommentsSectionComponent.COMPOSER_DOCK_IN_MS);
  }

  private clearComposerLeaveTimer(): void {
    if (this.composerLeaveTimer != null) {
      clearTimeout(this.composerLeaveTimer);
      this.composerLeaveTimer = null;
    }
  }

  private loadComments(cursor?: string): void {
    this.loading.set(true);
    this.loadError.set(null);

    this.commentService
      .listTopLevel(this.wordpressPostId, { cursor, limit: 10 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.comments.update((prev) => cursor ? [...prev, ...res.data] : res.data);
          this.nextCursor.set(res.meta.nextCursor);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.loadError.set(apiErrorMessage(err, 'Não foi possível carregar os comentários.'));
        },
      });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (cursor) {
      this.loadComments(cursor);
    }
  }

  onSubmit(event: { content: string; parentId?: string }): void {
    if (!this.auth.currentUser) {
      this.openLoginDialog();
      return;
    }

    this.submitting.set(true);
    this.commentService
      .create(this.wordpressPostId, event.content, event.parentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.submitting.set(false);

          if (event.parentId) {
            this.comments.update((list) =>
              list.map((c) =>
                c.id === event.parentId
                  ? { ...c, replyCount: (c.replyCount ?? 0) + 1 }
                  : c
              )
            );
          } else {
            this.comments.update((list) => [res.comment, ...list]);
          }

          this.replyingTo.set(null);

          this.homeService.invalidateHomeFeedCache();

          if (res.missions) {
            this.missionFeedback.handleMissionsUpdate(res.missions);
          }

          const xpReward = res.rewards?.find((r) => r.source?.startsWith('COMMENT_XP'));
          if (xpReward && xpReward.xpDelta > 0) {
            try {
              this.snackBar.openFromComponent(ReadRewardToastComponent, {
                data: { points: xpReward.xpDelta },
                duration: 3500,
                horizontalPosition: 'right',
                verticalPosition: 'bottom',
                panelClass: ['read-reward-snackbar'],
              });
            } catch {
              this.feedback.showSuccess(`+${xpReward.xpDelta} XP por comentar!`);
            }
          }
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível publicar o comentário.'));
        },
      });
  }

  onLikeComment(event: { commentId: string; liked: boolean; likeCount: number }): void {
    this.comments.update((list) =>
      list.map((c) =>
        c.id === event.commentId
          ? { ...c, liked: event.liked, likeCount: event.likeCount }
          : c
      )
    );
  }

  onReplyRequested(comment: CommentView): void {
    if (!this.auth.currentUser) {
      this.openLoginDialog();
      return;
    }
    this.replyingTo.set(comment);
  }

  onDeleteRequested(commentId: string): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      data: {
        message: 'Excluir este comentário?',
        confirmLabel: 'Excluir',
        cancelLabel: 'Cancelar',
      },
    });

    ref.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe((confirmed) => {
        if (!confirmed) return;

        this.commentService
          .delete(commentId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.comments.update((list) => list.filter((c) => c.id !== commentId));
              this.lastDeletedCommentId.set(commentId);
            },
            error: (err: unknown) => {
              this.feedback.showError(apiErrorMessage(err, 'Não foi possível excluir o comentário.'));
            },
          });
      });
  }

  onInputClick(): void {
    if (!this.auth.currentUser) {
      this.openLoginDialog();
    }
  }

  openLoginDialog(): void {
    if (this.dialogOpen) return;
    this.dialogOpen = true;
    const ref = this.dialog.open(LoginRequiredDialogComponent, {
      data: { points: 1, actionLabel: 'comentar' },
    });
    ref.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.dialogOpen = false;
    });
  }
}
