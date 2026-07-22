import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntil } from 'rxjs';
import { NavComponent } from '../../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { HomeService } from '../../home/services/home.service';
import { DiscoveryTopic } from '../../../shared/interface/home.interface';
import { Destroyable } from '../../../shared/utils/destroyable';
import { apiErrorMessage } from '../../../shared/utils/api-error-message';

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

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly topics = signal<DiscoveryTopic[]>([]);
  /** IDs que o utilizador segue (resto = "Seguir"). */
  readonly followingIds = signal<Set<number>>(new Set());
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

  isFollowing(topic: DiscoveryTopic): boolean {
    return this.followingIds().has(topic.id);
  }

  toggleFollow(topic: DiscoveryTopic, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    const next = new Set(this.followingIds());
    if (next.has(topic.id)) {
      next.delete(topic.id);
    } else {
      next.add(topic.id);
    }
    this.followingIds.set(next);
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
          this.initFollowingDefaults(list);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar os tópicos.'));
        },
      });
  }

  /**
   * Alinha ao mock: quase todos "Seguindo"; um item em "Seguir".
   * Escolhe o 7.º item (índice 6) quando existir, senão o último.
   */
  private initFollowingDefaults(list: DiscoveryTopic[]): void {
    const following = new Set<number>();
    const notFollowingIndex = list.length > 7 ? 6 : Math.max(0, list.length - 1);
    list.forEach((t, i) => {
      if (i !== notFollowingIndex) {
        following.add(t.id);
      }
    });
    this.followingIds.set(following);
  }
}
