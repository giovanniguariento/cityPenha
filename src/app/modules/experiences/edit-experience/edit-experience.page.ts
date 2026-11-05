import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, forkJoin, of, switchMap } from 'rxjs';
import { APP_ASSETS } from '../../../shared/constants/app-assets';
import type { ExperienceMine } from '../../../shared/interface/experience.interface';
import { FeedbackService } from '../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../shared/utils/api-error-message';
import { CreatePostCategory, CreatePostService } from '../../create-post/create-post.service';
import { ExperienceService } from '../services/experience.service';

function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

@Component({
  selector: 'app-edit-experience',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './edit-experience.page.html',
  styleUrls: [
    '../../create-post/create-post.page.scss',
    '../create-experience/create-experience.page.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditExperiencePage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly experienceService = inject(ExperienceService);
  private readonly createPost = inject(CreatePostService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly coverInput = viewChild<ElementRef<HTMLInputElement>>('coverInput');
  readonly logoUrl = APP_ASSETS.logo;

  readonly experienceId = signal('');
  readonly loading = signal(true);
  readonly title = signal('');
  readonly description = signal('');
  readonly venue = signal('');
  readonly address = signal('');
  readonly startsAt = signal('');
  readonly endsAt = signal('');
  readonly conditionLabel = signal('');
  readonly featured = signal(false);
  readonly isAd = signal(false);
  readonly coverFile = signal<File | null>(null);
  readonly coverPreview = signal<string | null>(null);
  readonly existingCoverUrl = signal<string | null>(null);
  readonly publishing = signal(false);

  readonly categories = signal<CreatePostCategory[]>([]);
  readonly selectedCategoryIds = signal<number[]>([]);
  readonly categoriesLoading = signal(true);
  readonly categorySearchQuery = signal('');

  readonly filteredCategories = computed(() => {
    const q = this.categorySearchQuery().trim().toLowerCase();
    const list = this.categories();
    if (!q) return list;
    return list.filter((c) => c.name.toLowerCase().includes(q));
  });

  readonly canPublish = computed(() => {
    if (this.publishing() || this.loading()) return false;
    if (!this.title().trim() || !this.description().trim()) return false;
    if (!this.venue().trim()) return false;
    if (!this.startsAt()) return false;
    if (!this.coverFile() && !this.existingCoverUrl()) return false;
    return true;
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id') ?? '';
          this.experienceId.set(id);
          this.loading.set(true);
          this.categoriesLoading.set(true);
          return forkJoin({
            item: this.experienceService.getMine(id),
            categories: this.createPost.listCategories().pipe(
              catchError(() => {
                this.feedback.showError('Não foi possível carregar as categorias.');
                return of([] as CreatePostCategory[]);
              })
            ),
          });
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: ({ item, categories }) => {
          this.applyExperience(item);
          this.categories.set(categories);
          this.selectedCategoryIds.set(this.resolveSelectedIds(item.tags ?? [], categories));
          this.categoriesLoading.set(false);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.categoriesLoading.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Experiência não encontrada.'));
          void this.router.navigate(['/minhas-experiencias']);
        },
      });
  }

  private applyExperience(item: ExperienceMine): void {
    this.title.set(item.title);
    this.description.set(item.description);
    this.venue.set(item.meta.venue);
    this.address.set(item.meta.address ?? '');
    this.startsAt.set(item.startsAt ? toDatetimeLocal(item.startsAt) : '');
    this.endsAt.set(item.endsAt ? toDatetimeLocal(item.endsAt) : '');
    this.conditionLabel.set(item.meta.conditionLabel ?? '');
    this.featured.set(!!item.featured);
    this.isAd.set(!!item.isAd);
    this.existingCoverUrl.set(item.coverUrl);
    this.coverPreview.set(item.coverUrl);
  }

  /** Match saved tag names to WP category ids; orphans are dropped. */
  private resolveSelectedIds(tags: string[], categories: CreatePostCategory[]): number[] {
    const byName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));
    const ids: number[] = [];
    for (const tag of tags) {
      const id = byName.get(tag.trim().toLowerCase());
      if (id != null && !ids.includes(id)) ids.push(id);
    }
    return ids;
  }

  onCategorySearchInput(event: Event): void {
    this.categorySearchQuery.set((event.target as HTMLInputElement).value);
  }

  isCategorySelected(id: number): boolean {
    return this.selectedCategoryIds().includes(id);
  }

  toggleCategory(id: number): void {
    const current = this.selectedCategoryIds();
    if (current.includes(id)) {
      this.selectedCategoryIds.set(current.filter((x) => x !== id));
    } else {
      this.selectedCategoryIds.set([...current, id]);
    }
  }

  private selectedCategoryNames(): string[] {
    const selected = new Set(this.selectedCategoryIds());
    return this.categories()
      .filter((c) => selected.has(c.id))
      .map((c) => c.name);
  }

  onCoverSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) return;
    this.coverFile.set(file);
    if (this.coverPreview() && this.coverPreview() !== this.existingCoverUrl()) {
      URL.revokeObjectURL(this.coverPreview()!);
    }
    this.coverPreview.set(URL.createObjectURL(file));
  }

  pickCover(): void {
    this.coverInput()?.nativeElement.click();
  }

  onBack(): void {
    void this.router.navigate(['/minhas-experiencias']);
  }

  save(): void {
    if (!this.canPublish()) return;
    this.publishing.set(true);

    const startsAt = new Date(this.startsAt()).toISOString();
    const endsRaw = this.endsAt().trim();
    const endsAt = endsRaw ? new Date(endsRaw).toISOString() : null;

    this.experienceService
      .update(
        this.experienceId(),
        {
          title: this.title().trim(),
          description: this.description().trim(),
          venue: this.venue().trim(),
          address: this.address().trim() || undefined,
          startsAt,
          endsAt,
          conditionLabel: this.conditionLabel().trim() || undefined,
          tags: this.selectedCategoryNames(),
          featured: this.featured(),
          isAd: this.isAd(),
        },
        this.coverFile()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.publishing.set(false);
          this.feedback.showSuccess('Experiência atualizada!');
          void this.router.navigate(['/experiencias', updated.slug]);
        },
        error: (err: unknown) => {
          this.publishing.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível salvar.'));
        },
      });
  }
}
