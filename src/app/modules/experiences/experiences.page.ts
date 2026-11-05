import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntil } from 'rxjs';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component';
import { StateViewComponent } from '../../shared/components/state-view/state-view.component';
import { Destroyable } from '../../shared/utils/destroyable';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { FeedbackService } from '../../shared/services/feedback.service';
import { ExperienceListItem } from '../../shared/interface/experience.interface';
import { ExperienceService } from './services/experience.service';
import { ExperienceFeaturedCardComponent } from './components/experience-featured-card/experience-featured-card.component';
import { ExperienceListItemComponent } from './components/experience-list-item/experience-list-item.component';

@Component({
  selector: 'app-experiences',
  imports: [
    RouterLink,
    NavComponent,
    LegalFooterComponent,
    StateViewComponent,
    ExperienceFeaturedCardComponent,
    ExperienceListItemComponent,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './experiences.page.html',
  styleUrl: './experiences.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperiencesPage extends Destroyable {
  private readonly experienceService = inject(ExperienceService);
  private readonly feedback = inject(FeedbackService);

  private readonly listSection = viewChild<ElementRef<HTMLElement>>('listSection');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly items = signal<ExperienceListItem[]>([]);
  readonly searchQuery = signal('');

  readonly featured = computed(() => this.items().filter((item) => item.featured));

  readonly filteredItems = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.items();
    if (!q) {
      return list;
    }
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.meta.venue.toLowerCase().includes(q),
    );
  });

  constructor() {
    super();
    this.load();
  }

  retry(): void {
    this.load();
  }

  onSearchInput(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  onFilterClick(): void {
    this.feedback.showComingSoon();
  }

  scrollToList(event: Event): void {
    event.preventDefault();
    const el = this.listSection()?.nativeElement;
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  trackById(_index: number, item: ExperienceListItem): string {
    return item.id;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.experienceService
      .getList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (list) => {
          this.items.set(list);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar as experiências.'));
        },
      });
  }
}
