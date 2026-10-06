import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { APP_ASSETS } from '../../shared/constants/app-assets';
import { FeedbackService } from '../../shared/services/feedback.service';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import {
  isEmptyPostHtml,
  plainTextFromPostHtml,
  sanitizePostArticleHtml,
  sanitizePostDescriptionHtml,
} from '../../shared/utils/sanitize-post-description-html';
import { PostContentEditorComponent } from '../../shared/components/post-content-editor/post-content-editor.component';
import { HomeService } from '../home/services/home.service';
import { MyPostDetail, MyPostsService, MyPostType } from './my-posts.service';

interface CategoryOption {
  id: number;
  name: string;
}

@Component({
  selector: 'app-edit-post',
  standalone: true,
  imports: [FormsModule, PostContentEditorComponent],
  templateUrl: './edit-post.page.html',
  styleUrl: './edit-post.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditPostPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly myPosts = inject(MyPostsService);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly logoUrl = APP_ASSETS.logo;
  readonly loading = signal(true);
  readonly loadError = signal<string | null>(null);
  readonly saving = signal(false);

  readonly postId = signal<number | null>(null);
  readonly postType = signal<MyPostType>('article');
  readonly title = signal('');
  readonly summary = signal('');
  readonly contentHtml = signal('');
  readonly contentPlain = signal('');
  readonly categories = signal<CategoryOption[]>([]);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly categoriesLoading = signal(true);
  readonly videoUrl = signal<string | null>(null);
  readonly thumbnailUrl = signal<string | null>(null);
  /** Slug carregado na edição — usado para limpar o cache do detalhe após salvar. */
  private originalSlug: string | null = null;

  readonly canSave = computed(() => {
    if (this.loading() || this.saving() || this.categoriesLoading()) return false;
    if (this.selectedCategoryId() == null) return false;
    if (!this.contentPlain().trim()) return false;
    if (this.postType() === 'article' && !this.title().trim()) return false;
    return true;
  });

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isFinite(id) || id <= 0) {
      this.loading.set(false);
      this.loadError.set('Postagem inválida.');
      return;
    }
    this.postId.set(id);

    this.homeService
      .getResourcesHome()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (home) => {
          const opts = (home.categories ?? []).map((c) => ({ id: c.id, name: c.name }));
          this.categories.set(opts);
          this.categoriesLoading.set(false);
        },
        error: () => {
          this.categoriesLoading.set(false);
          this.feedback.showError('Não foi possível carregar as categorias.');
        },
      });

    this.myPosts
      .get(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (post) => this.applyPost(post),
        error: (err) => {
          this.loading.set(false);
          this.loadError.set(apiErrorMessage(err, 'Não foi possível carregar a postagem.'));
        },
      });
  }

  onBack(): void {
    void this.router.navigate(['/minhas-postagens']);
  }

  onContentHtmlChange(html: string): void {
    this.contentHtml.set(html);
  }

  onContentPlainChange(plain: string): void {
    this.contentPlain.set(plain);
  }

  selectCategory(id: number): void {
    this.selectedCategoryId.set(id);
  }

  save(): void {
    const id = this.postId();
    const categoryId = this.selectedCategoryId();
    if (id == null || categoryId == null || this.saving() || !this.canSave()) return;

    if (this.postType() === 'video') {
      this.saveVideo(id, categoryId);
      return;
    }
    this.saveArticle(id, categoryId);
  }

  private applyPost(post: MyPostDetail): void {
    this.postType.set(post.type);
    this.title.set(post.title ?? '');
    this.summary.set(post.type === 'article' ? (post.summary ?? '') : '');
    this.videoUrl.set(post.videoUrl ?? null);
    this.thumbnailUrl.set(post.thumbnailUrl || null);
    this.originalSlug = post.slug?.trim() || null;

    const html =
      post.type === 'video'
        ? (post.descriptionHtml ?? '')
        : (post.contentHtml ?? '');
    this.contentHtml.set(html);
    this.contentPlain.set(plainTextFromPostHtml(html));

    if (post.categoryId != null) {
      this.selectedCategoryId.set(post.categoryId);
    }

    this.loading.set(false);
  }

  private saveVideo(id: number, categoryId: number): void {
    const rawHtml = this.contentHtml();
    if (isEmptyPostHtml(rawHtml) && !this.contentPlain().trim()) {
      this.feedback.showError('Escreva uma legenda antes de salvar.');
      return;
    }
    const descriptionHtml = sanitizePostDescriptionHtml(rawHtml);
    const descriptionText = plainTextFromPostHtml(descriptionHtml);
    if (!descriptionText) {
      this.feedback.showError('Escreva uma legenda antes de salvar.');
      return;
    }

    this.saving.set(true);
    this.myPosts
      .update(id, {
        title: this.title().trim() || undefined,
        descriptionHtml,
        categoryId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.onSaveSuccess(result),
        error: (err) => this.onSaveError(err),
      });
  }

  private saveArticle(id: number, categoryId: number): void {
    const title = this.title().trim();
    if (!title) {
      this.feedback.showError('Adicione um título ao artigo.');
      return;
    }
    const rawHtml = this.contentHtml();
    if (isEmptyPostHtml(rawHtml)) {
      this.feedback.showError('Escreva o conteúdo do artigo antes de salvar.');
      return;
    }
    const contentHtml = sanitizePostArticleHtml(rawHtml);
    if (!plainTextFromPostHtml(contentHtml)) {
      this.feedback.showError('Escreva o conteúdo do artigo antes de salvar.');
      return;
    }

    this.saving.set(true);
    this.myPosts
      .update(id, {
        title,
        contentHtml,
        summary: this.summary().trim(),
        categoryId,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => this.onSaveSuccess(result),
        error: (err) => this.onSaveError(err),
      });
  }

  private onSaveSuccess(result: { categorySlug: string; slug: string }): void {
    this.saving.set(false);
    this.homeService.invalidateHomeFeedCache();
    if (this.originalSlug) {
      this.homeService.invalidatePostCache(this.originalSlug);
    }
    if (result.slug && result.slug !== this.originalSlug) {
      this.homeService.invalidatePostCache(result.slug);
    }
    this.feedback.showSuccess('Postagem atualizada!');
    if (result.categorySlug && result.slug) {
      void this.router.navigate(['/artigos', result.categorySlug, result.slug]);
      return;
    }
    void this.router.navigate(['/minhas-postagens']);
  }

  private onSaveError(err: unknown): void {
    this.saving.set(false);
    this.feedback.showError(apiErrorMessage(err, 'Não foi possível salvar a postagem.'));
  }
}
