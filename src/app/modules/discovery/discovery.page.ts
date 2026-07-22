import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component';
import { HomeService } from '../home/services/home.service';
import {
  DiscoveryPopularAuthor,
  DiscoverySearchResponse,
  DiscoveryTopic,
  Post,
} from '../../shared/interface/home.interface';
import { Destroyable } from '../../shared/utils/destroyable';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { DecodeHtmlEntitiesPipe } from '../../shared/pipes/decode-html-entities.pipe';
import { SeoService } from '../../shared/services/seo.service';
import { SITE_URL } from '../../shared/constants/site-url';

const DEFAULT_AUTHOR_AVATAR =
  'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=200';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_Q = 2;
const SEARCH_PREVIEW_LIMIT = 3;

const EMPTY_SEARCH: DiscoverySearchResponse = { posts: [], topics: [], authors: [] };

@Component({
  selector: 'app-discovery',
  imports: [NavComponent, LegalFooterComponent, RouterLink, DecodeHtmlEntitiesPipe],
  templateUrl: './discovery.page.html',
  styleUrl: './discovery.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoveryPage extends Destroyable {
  private readonly homeService = inject(HomeService);
  private readonly seoService = inject(SeoService);
  private readonly search$ = new Subject<string>();

  readonly searchWrap = viewChild<ElementRef<HTMLElement>>('searchWrap');

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly trendingTopics = signal<Post[]>([]);
  readonly worldNews = signal<Post[]>([]);
  readonly topics = signal<DiscoveryTopic[]>([]);
  readonly popularAuthors = signal<DiscoveryPopularAuthor[]>([]);

  readonly searchQuery = signal('');
  readonly searchOpen = signal(false);
  readonly searchLoading = signal(false);
  readonly searchError = signal<string | null>(null);
  readonly searchResults = signal<DiscoverySearchResponse>(EMPTY_SEARCH);

  readonly searchHasAny = computed(() => {
    const r = this.searchResults();
    return r.posts.length + r.topics.length + r.authors.length > 0;
  });

  constructor() {
    super();
    this.seoService.setPage({
      title: 'Descobrir',
      description: 'Explore tópicos em alta, notícias do mundo e autores populares no CityPenha.',
      url: `${SITE_URL}/discovery`,
      type: 'website',
    });
    this.setupSearch();
    this.load();
  }

  retry(): void {
    this.load();
  }

  onSearchInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.searchQuery.set(v);
    this.search$.next(v);
  }

  onSearchFocus(): void {
    if (this.searchQuery().trim().length >= SEARCH_MIN_Q) {
      this.searchOpen.set(true);
    }
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.closeSearch();
      (event.target as HTMLInputElement).blur();
    }
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  @HostListener('document:pointerdown', ['$event'])
  onDocumentPointerDown(event: PointerEvent): void {
    if (!this.searchOpen()) return;
    const wrap = this.searchWrap()?.nativeElement;
    const target = event.target as Node | null;
    if (wrap && target && !wrap.contains(target)) {
      this.closeSearch();
    }
  }

  indexLabel(index: number): string {
    return String(index + 1).padStart(2, '0');
  }

  articleMeta(post: Post): string {
    const reading = `${post.readingTime} Min Leitura`;
    const views =
      typeof post.viewsCount === 'number' && post.viewsCount > 0
        ? `${post.viewsCount} visualizações`
        : null;
    const parts = [reading, views, post.categoryName, post.publishedAtRelative?.trim()].filter(
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

  trackByTopicId(_index: number, topic: DiscoveryTopic): number {
    return topic.id;
  }

  authorAvatarUrl(url: string | null | undefined): string {
    const trimmed = url?.trim();
    return trimmed || DEFAULT_AUTHOR_AVATAR;
  }

  onAuthorAvatarError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.src !== DEFAULT_AUTHOR_AVATAR) {
      img.src = DEFAULT_AUTHOR_AVATAR;
    }
  }

  private setupSearch(): void {
    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((raw) => {
          const q = raw.trim();
          if (q.length < SEARCH_MIN_Q) {
            this.searchOpen.set(false);
            this.searchLoading.set(false);
            this.searchError.set(null);
            this.searchResults.set(EMPTY_SEARCH);
            return of(null);
          }
          this.searchOpen.set(true);
          this.searchLoading.set(true);
          this.searchError.set(null);
          return this.homeService.searchDiscovery(q, SEARCH_PREVIEW_LIMIT).pipe(
            tap({
              next: (data) => {
                this.searchResults.set(data);
                this.searchLoading.set(false);
                this.searchError.set(null);
              },
            }),
            catchError((err: unknown) => {
              this.searchLoading.set(false);
              this.searchResults.set(EMPTY_SEARCH);
              this.searchError.set(apiErrorMessage(err, 'Não foi possível pesquisar.'));
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
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
}
