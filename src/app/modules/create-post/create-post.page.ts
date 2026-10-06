import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { APP_ASSETS } from '../../shared/constants/app-assets';
import { FeedbackService } from '../../shared/services/feedback.service';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { captureVideoPoster } from '../../shared/utils/capture-video-poster';
import { prepareCoverImage } from '../../shared/utils/prepare-cover-image';
import {
  isEmptyPostHtml,
  plainTextFromPostHtml,
  sanitizePostArticleHtml,
  sanitizePostDescriptionHtml,
} from '../../shared/utils/sanitize-post-description-html';
import { PostContentEditorComponent } from '../../shared/components/post-content-editor/post-content-editor.component';
import { HomeService } from '../home/services/home.service';
import { CreatePostService, CreatePostType } from './create-post.service';
import { from, switchMap } from 'rxjs';

export interface CreateCategoryOption {
  id: number;
  name: string;
}

type CreateFlow = CreatePostType | null;

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [FormsModule, PostContentEditorComponent],
  templateUrl: './create-post.page.html',
  styleUrl: './create-post.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreatePostPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly createPost = inject(CreatePostService);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');
  readonly coverInput = viewChild<ElementRef<HTMLInputElement>>('coverInput');
  readonly logoUrl = APP_ASSETS.logo;

  /** null = choose type; video = short; article = full post. */
  readonly flow = signal<CreateFlow>(null);
  readonly videoFile = signal<File | null>(null);
  readonly videoUrl = signal<string | null>(null);
  readonly coverFile = signal<File | null>(null);
  readonly coverUrl = signal<string | null>(null);
  readonly title = signal('');
  /** Optional custom article excerpt (plain text). */
  readonly summary = signal('');
  /** TipTap HTML for caption (video) or body (article). */
  readonly contentHtml = signal('');
  readonly contentPlain = signal('');
  readonly publishing = signal(false);
  readonly categories = signal<CreateCategoryOption[]>([]);
  readonly selectedCategoryId = signal<number | null>(null);
  readonly categoriesLoading = signal(true);

  readonly showPicker = computed(() => this.flow() === null);
  readonly showComposer = computed(
    () =>
      this.flow() === 'article' ||
      (this.flow() === 'video' && !!this.videoUrl())
  );

  readonly canPublish = computed(() => {
    const flow = this.flow();
    if (flow == null || this.publishing() || this.categoriesLoading()) return false;
    if (this.selectedCategoryId() == null) return false;
    if (!this.contentPlain().trim()) return false;
    if (flow === 'video' && !this.videoFile()) return false;
    if (flow === 'article') {
      if (!this.title().trim() || !this.coverFile()) return false;
    }
    return true;
  });

  ngOnInit(): void {
    this.homeService
      .getResourcesHome()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (home) => {
          const opts = (home.categories ?? []).map((c) => ({ id: c.id, name: c.name }));
          this.categories.set(opts);
          if (opts.length && this.selectedCategoryId() == null) {
            this.selectedCategoryId.set(opts[0].id);
          }
          this.categoriesLoading.set(false);
        },
        error: () => {
          this.categoriesLoading.set(false);
          this.feedback.showError('Não foi possível carregar as categorias.');
        },
      });
  }

  ngOnDestroy(): void {
    this.revokePreview();
    this.clearCover();
  }

  chooseFlow(type: CreatePostType): void {
    this.contentHtml.set('');
    this.contentPlain.set('');
    this.title.set('');
    this.summary.set('');
    this.clearCover();
    if (type === 'video') {
      // Open gallery immediately; stay on type picker if user cancels.
      this.onPickVideoClick();
      return;
    }
    this.flow.set('article');
  }

  /** Type picker: exit to home. Composer: back to type picker. */
  onBack(): void {
    if (this.flow() != null) {
      this.clearVideo();
      this.clearCover();
      this.flow.set(null);
      this.contentHtml.set('');
      this.contentPlain.set('');
      this.title.set('');
      this.summary.set('');
      return;
    }
    void this.router.navigate(['/home']);
  }

  onPickVideoClick(): void {
    this.fileInput()?.nativeElement.click();
  }

  onVideoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('video/')) {
      this.feedback.showError('Selecione um arquivo de vídeo.');
      return;
    }
    this.revokePreview();
    this.videoFile.set(file);
    this.videoUrl.set(URL.createObjectURL(file));
    this.flow.set('video');
  }

  clearVideo(): void {
    this.revokePreview();
    this.videoFile.set(null);
    this.contentHtml.set('');
    this.contentPlain.set('');
  }

  onPickCoverClick(): void {
    this.coverInput()?.nativeElement.click();
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.feedback.showError('Selecione uma imagem (JPEG, PNG ou WebP).');
      return;
    }
    this.clearCover();
    this.coverFile.set(file);
    this.coverUrl.set(URL.createObjectURL(file));
  }

  clearCover(): void {
    const url = this.coverUrl();
    if (url) URL.revokeObjectURL(url);
    this.coverUrl.set(null);
    this.coverFile.set(null);
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

  publish(): void {
    const flow = this.flow();
    const categoryId = this.selectedCategoryId();
    if (flow == null || categoryId == null || this.publishing()) return;

    if (flow === 'video') {
      this.publishVideo(categoryId);
      return;
    }
    this.publishArticle(categoryId);
  }

  private publishVideo(categoryId: number): void {
    const file = this.videoFile();
    if (!file) return;

    const rawHtml = this.contentHtml();
    if (isEmptyPostHtml(rawHtml) && !this.contentPlain().trim()) {
      this.feedback.showError('Escreva uma legenda antes de publicar.');
      return;
    }

    const descriptionHtml = sanitizePostDescriptionHtml(rawHtml);
    const descriptionText = plainTextFromPostHtml(descriptionHtml);
    if (!descriptionText) {
      this.feedback.showError('Escreva uma legenda antes de publicar.');
      return;
    }

    this.publishing.set(true);
    from(captureVideoPoster(file))
      .pipe(
        switchMap((thumbnail) =>
          this.createPost.create({
            type: 'video',
            video: file,
            descriptionHtml,
            descriptionText,
            categoryId,
            title: this.title().trim() || undefined,
            thumbnail: thumbnail ?? undefined,
          })
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => this.onPublishSuccess(result),
        error: (err) => this.onPublishError(err),
      });
  }

  private publishArticle(categoryId: number): void {
    const title = this.title().trim();
    if (!title) {
      this.feedback.showError('Adicione um título ao artigo.');
      return;
    }

    const cover = this.coverFile();
    if (!cover) {
      this.feedback.showError('Escolha uma foto de destaque.');
      return;
    }

    const rawHtml = this.contentHtml();
    if (isEmptyPostHtml(rawHtml)) {
      this.feedback.showError('Escreva o conteúdo do artigo antes de publicar.');
      return;
    }

    const contentHtml = sanitizePostArticleHtml(rawHtml);
    const descriptionText = plainTextFromPostHtml(contentHtml);
    if (!descriptionText) {
      this.feedback.showError('Escreva o conteúdo do artigo antes de publicar.');
      return;
    }

    this.publishing.set(true);
    from(prepareCoverImage(cover))
      .pipe(
        switchMap((thumbnail) => {
          if (!thumbnail) {
            throw new Error('COVER_PREPARE_FAILED');
          }
          return this.createPost.create({
            type: 'article',
            contentHtml,
            descriptionText,
            categoryId,
            title,
            summary: this.summary().trim() || undefined,
            thumbnail,
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (result) => this.onPublishSuccess(result),
        error: (err) => {
          if (err instanceof Error && err.message === 'COVER_PREPARE_FAILED') {
            this.publishing.set(false);
            this.feedback.showError(
              'Não foi possível processar a foto de destaque. Tente outra imagem.'
            );
            return;
          }
          this.onPublishError(err);
        },
      });
  }

  private onPublishSuccess(result: { categorySlug: string; slug: string }): void {
    this.publishing.set(false);
    this.homeService.invalidateHomeFeedCache();
    this.feedback.showSuccess('Postagem publicada!');
    void this.router.navigate(['/artigos', result.categorySlug, result.slug]);
  }

  private onPublishError(err: unknown): void {
    this.publishing.set(false);
    this.feedback.showError(apiErrorMessage(err, 'Não foi possível publicar a postagem.'));
  }

  private revokePreview(): void {
    const url = this.videoUrl();
    if (url) URL.revokeObjectURL(url);
    this.videoUrl.set(null);
  }
}
