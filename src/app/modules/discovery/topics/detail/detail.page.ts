import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntil } from 'rxjs';
import { Post } from '../../../../shared/interface/home.interface';
import { HomeService } from '../../../home/services/home.service';
import { TabsCardComponent } from '../../../home/components/tabs-card/tabs-card.component';
import { NavComponent } from '../../../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../../../shared/components/legal-footer/legal-footer.component';
import { Destroyable } from '../../../../shared/utils/destroyable';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';

const PER_PAGE = 20;

@Component({
  selector: 'app-discovery-topic-detail',
  imports: [RouterLink, TabsCardComponent, NavComponent, LegalFooterComponent],
  templateUrl: './detail.page.html',
  styleUrl: './detail.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoveryTopicDetailPage extends Destroyable {
  private readonly route = inject(ActivatedRoute);
  private readonly homeService = inject(HomeService);

  readonly posts = signal<Post[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly hasMore = signal(false);
  readonly topicTitle = signal('Tópico');

  private slug = '';
  private page = 1;

  constructor() {
    super();
    const st =
      typeof history !== 'undefined'
        ? (history.state as { topicName?: string } | undefined)
        : undefined;
    if (st?.topicName) {
      this.topicTitle.set(st.topicName);
    }
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const slug = params.get('slug') ?? '';
      if (!slug) {
        this.loading.set(false);
        this.error.set('Tópico inválido.');
        return;
      }
      this.slug = slug;
      this.loadFirstPage();
    });
  }

  retry(): void {
    this.loadFirstPage();
  }

  loadMore(): void {
    if (this.loadingMore() || !this.hasMore()) {
      return;
    }
    this.loadingMore.set(true);
    const nextPage = this.page + 1;
    this.homeService
      .getTopicPosts(this.slug, nextPage, PER_PAGE)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.page = data.page;
          this.posts.update((current) => [...current, ...data.posts]);
          this.hasMore.set(data.hasMore);
          this.loadingMore.set(false);
        },
        error: (err: unknown) => {
          this.loadingMore.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar mais artigos.'));
        },
      });
  }

  trackByPostId(_index: number, post: Post): number | string {
    return post.id || post.slug;
  }

  private loadFirstPage(): void {
    this.page = 1;
    this.loading.set(true);
    this.error.set(null);
    this.homeService
      .getTopicPosts(this.slug, 1, PER_PAGE)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.page = data.page;
          this.posts.set(data.posts);
          this.hasMore.set(data.hasMore);
          if (data.topic?.name) {
            this.topicTitle.set(data.topic.name);
          }
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.posts.set([]);
          this.hasMore.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar os artigos.'));
        },
      });
  }
}
