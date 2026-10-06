import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { APP_ASSETS } from '../../shared/constants/app-assets';
import { FeedbackService } from '../../shared/services/feedback.service';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../shared/components/confirm-dialog/confirm-dialog.component';
import { MyPostListItem, MyPostsService } from './my-posts.service';

@Component({
  selector: 'app-my-posts',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './my-posts.page.html',
  styleUrl: './my-posts.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyPostsPage implements OnInit {
  private readonly myPosts = inject(MyPostsService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly logoUrl = APP_ASSETS.logo;
  readonly items = signal<MyPostListItem[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly deletingId = signal<number | null>(null);
  readonly openMenuId = signal<number | null>(null);

  ngOnInit(): void {
    this.loadPage(1, false);
  }

  loadMore(): void {
    if (!this.hasMore() || this.loadingMore()) return;
    this.loadPage(this.page() + 1, true);
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  viewPost(item: MyPostListItem): void {
    this.closeMenu();
    if (!item.categorySlug || !item.slug) {
      this.feedback.showError('Não foi possível abrir esta postagem.');
      return;
    }
    void this.router.navigate(['/artigos', item.categorySlug, item.slug]);
  }

  editPost(item: MyPostListItem): void {
    this.closeMenu();
    void this.router.navigate(['/minhas-postagens', item.id, 'editar']);
  }

  confirmDelete(item: MyPostListItem): void {
    this.closeMenu();
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          message: `Excluir “${item.title || 'esta postagem'}”? Ela irá para a lixeira e um administrador poderá restaurá-la.`,
          confirmLabel: 'Excluir',
          cancelLabel: 'Cancelar',
        },
      }
    );

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.deletePost(item);
      });
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'publish':
        return 'Publicado';
      case 'draft':
        return 'Rascunho';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  }

  typeLabel(type: MyPostListItem['type']): string {
    return type === 'video' ? 'Vídeo' : 'Artigo';
  }

  private deletePost(item: MyPostListItem): void {
    if (this.deletingId() != null) return;
    this.deletingId.set(item.id);
    this.myPosts
      .remove(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.items.update((list) => list.filter((p) => p.id !== item.id));
          this.deletingId.set(null);
          this.feedback.showSuccess('Postagem excluída.');
        },
        error: (err) => {
          this.deletingId.set(null);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível excluir a postagem.'));
        },
      });
  }

  private loadPage(page: number, append: boolean): void {
    if (append) {
      this.loadingMore.set(true);
    } else {
      this.loading.set(true);
      this.error.set(null);
    }

    this.myPosts
      .list(page)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.items.update((current) =>
            append ? [...current, ...result.items] : result.items
          );
          this.page.set(result.page);
          this.hasMore.set(result.hasMore);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.loadingMore.set(false);
          if (!append) {
            this.error.set(apiErrorMessage(err, 'Não foi possível carregar suas postagens.'));
          } else {
            this.feedback.showError(apiErrorMessage(err, 'Não foi possível carregar mais postagens.'));
          }
        },
      });
  }
}
