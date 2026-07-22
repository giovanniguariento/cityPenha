import {
  ChangeDetectionStrategy,
  Component,
  inject,
  Input,
  OnChanges,
  SimpleChanges,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Auth } from '@angular/fire/auth';
import { MatDialog } from '@angular/material/dialog';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  ConnectedPosition,
} from '@angular/cdk/overlay';
import { EMPTY, switchMap, take, takeUntil } from 'rxjs';
import { Post } from '../../../../shared/interface/home.interface';
import { DecodeHtmlEntitiesPipe } from '../../../../shared/pipes/decode-html-entities.pipe';
import { LoginRequiredDialogComponent } from '../../../../shared/components/login-required-dialog/login-required-dialog.component';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { MissionFeedbackService } from '../../../../shared/services/mission-feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { Destroyable } from '../../../../shared/utils/destroyable';
import { HomeService } from '../../services/home.service';

@Component({
  selector: 'app-tabs-card',
  imports: [
    CommonModule,
    RouterLink,
    DecodeHtmlEntitiesPipe,
    CdkOverlayOrigin,
    CdkConnectedOverlay,
  ],
  templateUrl: './tabs-card.component.html',
  styleUrl: './tabs-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsCardComponent extends Destroyable implements OnChanges {
  @Input({ required: true }) card!: Post;
  @Input({ required: true }) category!: string;

  private readonly auth = inject(Auth);
  private readonly dialog = inject(MatDialog);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);
  private readonly missionFeedback = inject(MissionFeedbackService);

  readonly menuOpen = signal(false);
  readonly bookmarked = signal(false);
  readonly savePending = signal(false);

  readonly menuPositions: ConnectedPosition[] = [
    {
      originX: 'start',
      originY: 'bottom',
      overlayX: 'start',
      overlayY: 'top',
      offsetY: 4,
    },
    {
      originX: 'start',
      originY: 'top',
      overlayX: 'start',
      overlayY: 'bottom',
      offsetY: -4,
    },
  ];

  private dialogOpen = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['card'] && this.card) {
      this.applyBookmarkStateFromPost(this.card);
    }
  }

  override ngOnDestroy(): void {
    this.closeMenu();
    super.ngOnDestroy();
  }

  toggleMenu(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  onSaveArticle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();

    const firebaseUser = this.auth.currentUser;
    if (!firebaseUser) {
      this.closeMenu();
      this.openLoginDialog();
      return;
    }

    if (typeof this.card?.id !== 'number' || this.savePending()) {
      return;
    }

    const wordpressPostId = this.card.id;
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
          this.syncLocalSavedFolderIds(willBookmark, res.folderId);
          this.closeMenu();
          this.feedback.showSuccess(
            willBookmark ? 'Artigo salvo na sua biblioteca.' : 'Artigo removido dos salvos.'
          );
          this.missionFeedback.handleMissionsUpdate(res.missions);
        },
        error: (err: unknown) => {
          this.savePending.set(false);
          this.bookmarked.set(previousBookmarked);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível atualizar os salvos.'));
        },
      });
  }

  onComingSoon(event: Event, _featureLabel: string): void {
    event.preventDefault();
    event.stopPropagation();
    this.closeMenu();
    this.feedback.showComingSoon();
  }

  /** Salvo na pasta "Salvos" quando `savedFolderIds` inclui a pasta default_saved. */
  private applyBookmarkStateFromPost(post: Post): void {
    const ids = post.savedFolderIds;
    if (!ids?.length) {
      this.bookmarked.set(false);
      return;
    }
    this.homeService
      .getDefaultSavedFolderId()
      .pipe(take(1), takeUntil(this.destroy$))
      .subscribe((folderId) => {
        this.bookmarked.set(folderId ? ids.includes(folderId) : false);
      });
  }

  private syncLocalSavedFolderIds(willBookmark: boolean, folderId: string): void {
    const current = this.card.savedFolderIds ?? [];
    if (willBookmark) {
      this.card.savedFolderIds = current.includes(folderId) ? current : [...current, folderId];
    } else {
      this.card.savedFolderIds = current.filter((id) => id !== folderId);
    }
  }

  private openLoginDialog(): void {
    if (this.dialogOpen) return;
    this.dialogOpen = true;
    const dialogRef = this.dialog.open(LoginRequiredDialogComponent, {
      data: {
        postId: this.card.id,
        points: 10,
        actionLabel: 'salvar esta notícia',
      },
    });
    dialogRef.afterClosed().pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.dialogOpen = false;
    });
  }
}
