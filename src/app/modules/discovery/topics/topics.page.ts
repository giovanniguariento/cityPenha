import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntil } from 'rxjs';
import { NavComponent } from '../../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { HomeService } from '../../home/services/home.service';
import { DiscoveryTopic } from '../../../shared/interface/home.interface';
import { Destroyable } from '../../../shared/utils/destroyable';
import { apiErrorMessage } from '../../../shared/utils/api-error-message';
import { FeedbackService } from '../../../shared/services/feedback.service';

const PLACEHOLDER_IMAGES = ['assets/topicos.jpg', 'assets/escolha-editores.jpg', 'assets/noticias-mundo.jpg'];

@Component({
  selector: 'app-discovery-topics',
  imports: [NavComponent, LegalFooterComponent, RouterLink],
  templateUrl: './topics.page.html',
  styleUrl: './topics.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoveryTopicsPage extends Destroyable {
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly topics = signal<DiscoveryTopic[]>([]);
  readonly searchQuery = signal('');

  readonly filteredTopics = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const list = this.topics();
    if (!q) {
      return list;
    }
    return list.filter((t) => t.name.toLowerCase().includes(q));
  });

  constructor() {
    super();
    this.load();
  }

  retry(): void {
    this.load();
  }

  topicImage(topic: DiscoveryTopic, index: number): string {
    const url = topic.latestPostImageUrl?.trim();
    if (url) {
      return url;
    }
    return PLACEHOLDER_IMAGES[index % PLACEHOLDER_IMAGES.length];
  }

  toggleFollow(_topic: DiscoveryTopic, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.feedback.showComingSoon();
  }

  onSearchInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.searchQuery.set(v);
  }

  trackByTopicId(_index: number, topic: DiscoveryTopic): number {
    return topic.id;
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.homeService
      .getDiscovery()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          const list = data.topics ?? [];
          this.topics.set(list);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar os tópicos.'));
        },
      });
  }
}
