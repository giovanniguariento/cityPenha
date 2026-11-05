import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { APP_ASSETS } from '../../../shared/constants/app-assets';
import { FeedbackService } from '../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../shared/utils/api-error-message';
import { CreatePostCategory, CreatePostService } from '../../create-post/create-post.service';
import { ExperienceService } from '../services/experience.service';

/** Fixed XP badge amount for new experiences (not editable in the form). */
const DEFAULT_EXPERIENCE_XP = 50;

@Component({
  selector: 'app-create-experience',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './create-experience.page.html',
  styleUrls: [
    '../../create-post/create-post.page.scss',
    './create-experience.page.scss',
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateExperiencePage implements OnInit {
  private readonly router = inject(Router);
  private readonly experienceService = inject(ExperienceService);
  private readonly createPost = inject(CreatePostService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly coverInput = viewChild<ElementRef<HTMLInputElement>>('coverInput');
  readonly logoUrl = APP_ASSETS.logo;

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
    if (this.publishing()) return false;
    if (!this.title().trim() || !this.description().trim()) return false;
    if (!this.venue().trim()) return false;
    if (!this.startsAt() || !this.coverFile()) return false;
    return true;
  });

  ngOnInit(): void {
    this.loadCategories();
  }

  private loadCategories(): void {
    this.categoriesLoading.set(true);
    this.createPost
      .listCategories()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.categories.set(list);
          this.categoriesLoading.set(false);
        },
        error: () => {
          this.categoriesLoading.set(false);
          this.feedback.showError('Não foi possível carregar as categorias.');
        },
      });
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
    const prev = this.coverPreview();
    if (prev) URL.revokeObjectURL(prev);
    this.coverPreview.set(URL.createObjectURL(file));
  }

  pickCover(): void {
    this.coverInput()?.nativeElement.click();
  }

  onBack(): void {
    void this.router.navigate(['/criar-postagem']);
  }

  publish(): void {
    if (!this.canPublish()) return;
    this.publishing.set(true);

    const startsAt = new Date(this.startsAt()).toISOString();
    const endsRaw = this.endsAt().trim();
    const endsAt = endsRaw ? new Date(endsRaw).toISOString() : null;

    this.experienceService
      .create(
        {
          title: this.title().trim(),
          description: this.description().trim(),
          venue: this.venue().trim(),
          address: this.address().trim() || undefined,
          startsAt,
          endsAt,
          conditionLabel: this.conditionLabel().trim() || undefined,
          tags: this.selectedCategoryNames(),
          xpReward: DEFAULT_EXPERIENCE_XP,
          featured: this.featured(),
          isAd: this.isAd(),
          status: 'published',
        },
        this.coverFile()
      )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (created) => {
          this.publishing.set(false);
          this.feedback.showSuccess('Experiência publicada!');
          void this.router.navigate(['/experiencias', created.slug]);
        },
        error: (err: unknown) => {
          this.publishing.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível publicar a experiência.'));
        },
      });
  }
}
