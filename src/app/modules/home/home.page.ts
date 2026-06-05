import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { Destroyable } from '../../shared/utils/destroyable';
import { NavComponent } from '../../shared/components/nav/nav.component'
import { HeaderComponent } from '../../shared/components/header/header.component'
import { CardNoticiaComponent } from '../home/components/card-noticia/card-noticia.component'
import { CardExpComponent } from '../home/components/card-exp/card-exp.component'
import { TabsComponent } from '../home/components/tabs/tabs.component'
import { HomeSkeletonComponent } from '../../shared/components/home-skeleton/home-skeleton.component';
import { HomeService } from './services/home.service';
import { Category, Post } from '../../shared/interface/home.interface';
import { takeUntil } from 'rxjs';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { SeoService } from '../../shared/services/seo.service';

@Component({
  selector: 'app-home',
  imports: [NavComponent, HeaderComponent, CardNoticiaComponent, CardExpComponent, TabsComponent, HomeSkeletonComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage extends Destroyable {
  private readonly homeService = inject(HomeService);
  private readonly seoService = inject(SeoService);

  tabs = signal<Category[]>([]);
  posts = signal<Post[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  homeData$ = this.homeService.getResourcesHome();

  constructor() {
    super();
    this.seoService.setPage({
      title: 'CityPenha — Portal de Notícias',
      description: 'As últimas notícias de Penha e região. Fique por dentro de tudo que acontece na sua cidade.',
      url: 'https://citypenha.com.br/home',
      type: 'website',
    });
    this.homeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.tabs.set(response.categories);
          this.posts.set(response.carousel);
          this.loading.set(false);
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar o início.'));
        },
      });
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
}
