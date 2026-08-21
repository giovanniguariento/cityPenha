import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Destroyable } from '../../shared/utils/destroyable';
import { NavComponent } from '../../shared/components/nav/nav.component'
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component'
import { HeaderComponent } from '../../shared/components/header/header.component'
import { CardNoticiaComponent } from '../home/components/card-noticia/card-noticia.component'
import { CardExpComponent } from '../home/components/card-exp/card-exp.component'
import { TabsComponent } from '../home/components/tabs/tabs.component'
import { HomeSkeletonComponent } from '../../shared/components/home-skeleton/home-skeleton.component';
import { StateViewComponent } from '../../shared/components/state-view/state-view.component';
import { HomeService } from './services/home.service';
import { Category, Post } from '../../shared/interface/home.interface';
import { takeUntil } from 'rxjs';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { SeoService } from '../../shared/services/seo.service';
import { OnboardingService } from '../../shared/services/onboarding.service';
import { SITE_URL } from '../../shared/constants/site-url';

@Component({
  selector: 'app-home',
  imports: [NavComponent, LegalFooterComponent, HeaderComponent, CardNoticiaComponent, CardExpComponent, TabsComponent, HomeSkeletonComponent, StateViewComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage extends Destroyable {
  private readonly homeService = inject(HomeService);
  private readonly seoService = inject(SeoService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly onboarding = inject(OnboardingService);

  tabs = signal<Category[]>([]);
  posts = signal<Post[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    super();
    this.seoService.setPage({
      title: 'CityPenha Digital',
      description: 'CityPenha Digital: conteúdo editorial de qualidade sobre a Penha e região desde 2006.',
      url: `${SITE_URL}/home`,
      type: 'website',
    });
    this.seoService.setHomeStructuredData();
    this.load();
  }

  /** Carrega o feed da home. Reutilizado pelo botão "Tentar novamente". */
  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.homeService
      .getResourcesHome()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tabs.set(response.categories);
          this.posts.set(response.carousel);
          this.loading.set(false);
          this.error.set(null);
          this.maybeStartOnboarding();
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar o início.'));
        },
      });
  }

  /** Tenta recarregar o feed após um erro. */
  reload(): void {
    this.load();
  }

  hasFeedContent(): boolean {
    if (this.posts().length > 0) {
      return true;
    }
    return this.tabs().some((t) => (t.posts?.length ?? 0) > 0);
  }

  trackByPostId(_index: number, post: Post): number | string {
    return post.id || post.slug;
  }

  trackByTabId(_index: number, tab: Category): number {
    return tab.id;
  }

  /** Dispara o onboarding na primeira visita, já com o feed carregado no DOM. */
  private maybeStartOnboarding(): void {
    if (!isPlatformBrowser(this.platformId) || this.onboarding.hasCompleted()) {
      return;
    }
    const firstPost = this.firstArticleContext();
    // setTimeout(0) garante que os alvos [data-tour] já renderizaram.
    setTimeout(() => this.onboarding.start({ firstPost }), 0);
  }

  /** Primeiro post do feed com slug e categoria, usado no passo do artigo. */
  private firstArticleContext(): { slug: string; categorySlug: string } | undefined {
    const candidates: Post[] = [
      ...this.posts(),
      ...this.tabs().flatMap((t) => t.posts ?? []),
    ];
    const post = candidates.find((p) => p?.slug && p?.categorySlug);
    return post ? { slug: post.slug, categorySlug: post.categorySlug } : undefined;
  }
}
