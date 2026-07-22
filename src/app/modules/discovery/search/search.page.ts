import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, of } from 'rxjs';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { NavComponent } from '../../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { HomeService } from '../../home/services/home.service';
import {
  DiscoveryPopularAuthor,
  DiscoverySearchResponse,
  DiscoveryTopic,
  Post,
} from '../../../shared/interface/home.interface';
import { Destroyable } from '../../../shared/utils/destroyable';
import { apiErrorMessage } from '../../../shared/utils/api-error-message';
import { DecodeHtmlEntitiesPipe } from '../../../shared/pipes/decode-html-entities.pipe';
import { SeoService } from '../../../shared/services/seo.service';
import { SITE_URL } from '../../../shared/constants/site-url';

const DEFAULT_AUTHOR_AVATAR =
  'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=200';

const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_MIN_Q = 2;
const SEARCH_PAGE_LIMIT = 20;

const EMPTY_SEARCH: DiscoverySearchResponse = { posts: [], topics: [], authors: [] };

@Component({
  selector: 'app-discovery-search',
  imports: [NavComponent, LegalFooterComponent, RouterLink, DecodeHtmlEntitiesPipe],
  templateUrl: './search.page.html',
  styleUrl: './search.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiscoverySearchPage extends Destroyable {
  private readonly homeService = inject(HomeService);
  private readonly seoService = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly search$ = new Subject<string>();

  readonly searchQuery = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly results = signal<DiscoverySearchResponse>(EMPTY_SEARCH);

  readonly hasAny = computed(() => {
    const r = this.results();
    return r.posts.length + r.topics.length + r.authors.length > 0;
  });

  readonly queryTooShort = computed(() => this.searchQuery().trim().length < SEARCH_MIN_Q);

  constructor() {
    super();
    this.setupSearch();

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const q = (params.get('q') ?? '').trim();
      this.searchQuery.set(q);
      this.updateSeo(q);
      this.search$.next(q);
    });
  }

  onSearchInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.searchQuery.set(v);
    this.search$.next(v);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: v.trim() || null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  retry(): void {
    this.search$.next(this.searchQuery());
  }

  articleMeta(post: Post): string {
    const reading = `${post.readingTime} Min Leitura`;
    const parts = [reading, post.categoryName].filter((p): p is string => Boolean(p));
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

  private updateSeo(q: string): void {
    const title = q ? `Busca: ${q}` : 'Busca';
    this.seoService.setPage({
      title,
      description: q
        ? `Resultados da pesquisa por “${q}” no CityPenha.`
        : 'Pesquise notícias, tópicos e autores no CityPenha.',
      url: q
        ? `${SITE_URL}/discovery/search?q=${encodeURIComponent(q)}`
        : `${SITE_URL}/discovery/search`,
      type: 'website',
      noindex: true,
    });
  }

  private setupSearch(): void {
    this.search$
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((raw) => raw.trim()),
        distinctUntilChanged(),
        switchMap((q) => {
          if (q.length < SEARCH_MIN_Q) {
            this.loading.set(false);
            this.error.set(null);
            this.results.set(EMPTY_SEARCH);
            return of(null);
          }
          this.loading.set(true);
          this.error.set(null);
          return this.homeService.searchDiscovery(q, SEARCH_PAGE_LIMIT).pipe(
            tap({
              next: (data) => {
                this.results.set(data);
                this.loading.set(false);
                this.error.set(null);
              },
            }),
            catchError((err: unknown) => {
              this.loading.set(false);
              this.results.set(EMPTY_SEARCH);
              this.error.set(apiErrorMessage(err, 'Não foi possível pesquisar.'));
              return of(null);
            })
          );
        }),
        takeUntil(this.destroy$)
      )
      .subscribe();
  }
}
