import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { Destroyable } from '../../shared/utils/destroyable';
import { NavComponent } from '../../shared/components/nav/nav.component'
import { HeaderComponent } from '../../shared/components/header/header.component'
import { CardNoticiaComponent } from '../home/components/card-noticia/card-noticia.component'
import { CardExpComponent } from '../home/components/card-exp/card-exp.component'
import { TabsComponent } from '../home/components/tabs/tabs.component'
import { HomeService } from './services/home.service';
import { AsyncPipe } from '@angular/common';
import { Category, Post } from '../../shared/interface/home.interface';
import { takeUntil } from 'rxjs';

@Component({
  selector: 'app-home',
  imports: [NavComponent, HeaderComponent, CardNoticiaComponent, CardExpComponent, TabsComponent, AsyncPipe],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePage extends Destroyable {
  private readonly homeService = inject(HomeService);

  tabs = signal<Category[]>([]);
  posts = signal<Post[]>([]);
  homeData$ = this.homeService.getResourcesHome();

  constructor() {
    super();
    this.homeData$
      .pipe(takeUntil(this.destroy$))
      .subscribe((response) => {
        this.tabs.set(response.categories);
        this.posts.set(response.carousel);
      });
  }

  trackByPostId(_index: number, post: Post): number | string {
    return post.id || post.slug;
  }

  trackByTabId(_index: number, tab: Category): number {
    return tab.id;
  }
}
