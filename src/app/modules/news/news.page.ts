import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HomeService } from '../home/services/home.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntil } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PostDetail } from '../../shared/interface/home.interface';
import { Destroyable } from '../../shared/utils/destroyable';
import { MatDialog } from '@angular/material/dialog';
import { LoginRequiredDialogComponent } from '../../shared/components/login-required-dialog/login-required-dialog.component';

@Component({
  selector: 'app-news-page',
  imports: [RouterLink, CommonModule, LoginRequiredDialogComponent],
  templateUrl: './news.page.html',
  styleUrl: './news.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsPageComponent extends Destroyable implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private scrollHandler?: () => void;
  private readSentForPost = new Set<number>();
  // Tracks posts that currently have an in-flight "read" request
  private readPendingForPost = new Set<number>();
  // Tracks posts for which we've already attempted to mark-as-read (prevents repeated attempts)
  private readAttemptedForPost = new Set<number>();

  news = signal<PostDetail | null>(null);
  following = signal<boolean>(false);
  bookmarked = signal<boolean>(false);
  readingTime = signal<number>(0);
  // no local modal flag — use Material dialog
  private readonly dialog = inject(MatDialog);
  private dialogOpen = false;
  private firstRenderAt = 0;

  constructor() {
    super();
    this.activatedRoute.params
      .pipe(
        switchMap((params) => this.homeService.getPost(params['slug'])),
        takeUntil(this.destroy$)
      )
      .subscribe((post) => {
        const sanitizedPost: PostDetail = {
          ...post,
          content: typeof post.content === 'string'
            ? this.sanitizer.bypassSecurityTrustHtml(post.content)
            : post.content
        };
        this.news.set(sanitizedPost);
        // Ensure reading progress is calculated after the content is set and rendered.
        // Use a microtask to wait for the DOM update.
        // record render time so we can avoid immediately treating fit-to-viewport as "read"
        this.firstRenderAt = Date.now();
        setTimeout(() => this.updateReadingProgress(), 0);
      });
  }

  ngOnInit(): void {
    // Use a dedicated updater so it can be invoked both on scroll and after content render.
    this.scrollHandler = () => this.updateReadingProgress();

    window.addEventListener('scroll', this.scrollHandler, { passive: true });

    // Calculate initial progress immediately (in case the page is already scrolled or content fits viewport)
    this.updateReadingProgress();
  }

  override ngOnDestroy(): void {
    // call base teardown for destroy$
    super.ngOnDestroy();
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
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

    if (this.readingTime() >= 100) {
      const post = this.news();
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

    const userId = (() => {
      try {
        return localStorage.getItem('userId');
      } catch {
        return null;
      }
    })();

    // If user not logged, show a lightweight modal explaining points reward (throttled)
    if (!userId) {
      this.maybeShowEarnPointsModal(post);
      return;
    }

    this.readPendingForPost.add(post.id);
    this.homeService.markPostRead(post.id, userId, post.slug)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.readSentForPost.add(post.id);
          this.readPendingForPost.delete(post.id);
        },
        error: () => {
          // silent fail - we don't want to disrupt UX if backend call fails
          this.readPendingForPost.delete(post.id);
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

  onFollowClick() {
    const userId = (() => {
      try {
        return localStorage.getItem('userId');
      } catch {
        return null;
      }
    })();

    const post = this.news();
    if (userId) {
      this.following.set(!this.following());
    } else if (post) {
      this.openLoginDialogWithAction(post, 'seguir este autor', 5);
    }
  }

  onListenClick() {
    const userId = (() => {
      try {
        return localStorage.getItem('userId');
      } catch {
        return null;
      }
    })();
    const post = this.news();
    if (userId) {
      // If you have audio player integration, trigger it here.
      // fallback: do nothing
    } else if (post) {
      this.openLoginDialogWithAction(post, 'ouvir o conteúdo', 2);
    }
  }

  onSaveClick() {
    const userId = (() => {
      try {
        return localStorage.getItem('userId');
      } catch {
        return null;
      }
    })();
    const post = this.news();
    if (userId) {
      this.bookmarked.set(!this.bookmarked());
    } else if (post) {
      this.openLoginDialogWithAction(post, 'salvar esta notícia', 10);
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
