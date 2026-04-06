import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntil } from 'rxjs';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { HomeService } from '../home/services/home.service';
import {
  DiscoveryPopularAuthor,
  DiscoveryTopic,
  Post,
} from '../../shared/interface/home.interface';
import { Destroyable } from '../../shared/utils/destroyable';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { DecodeHtmlEntitiesPipe } from '../../shared/pipes/decode-html-entities.pipe';

@Component({
  selector: 'app-discovery',
  imports: [NavComponent, RouterLink, DecodeHtmlEntitiesPipe],
  templateUrl: './discovery.page.html',
  styleUrl: './discovery.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoveryPage extends Destroyable {
  private readonly homeService = inject(HomeService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly trendingTopics = signal<Post[]>([]);
  readonly worldNews = signal<Post[]>([]);
  readonly topics = signal<DiscoveryTopic[]>([]);
  readonly popularAuthors = signal<DiscoveryPopularAuthor[]>([]);

  constructor() {
    super();
    this.load();
  }

  retry(): void {
    this.load();
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.homeService
      .getDiscovery()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.trendingTopics.set(data.trendingTopics ?? []);
          this.worldNews.set(data.worldNews ?? []);
          this.topics.set(data.topics ?? []);
          this.popularAuthors.set(data.popularAuthors ?? []);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar a descoberta.'));
        },
      });
  }

  indexLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  articleMeta(post: Post): string {
    const reading = `${post.readingTime} Min Leitura`;
    const parts = [reading, post.categoryName, post.publishedAtRelative?.trim()].filter(
      (p): p is string => Boolean(p)
    );
    return parts.join(' • ');
  }

  trackByPostId(_index: number, post: Post): number {
    return post.id;
  }

  trackByAuthorId(_index: number, author: DiscoveryPopularAuthor): number {
    return author.wordpressUserId;
  }
}
