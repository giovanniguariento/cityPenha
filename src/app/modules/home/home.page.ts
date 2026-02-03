import { Component, CUSTOM_ELEMENTS_SCHEMA, inject, OnInit } from '@angular/core';
import { NavComponent } from '../../shared/components/nav/nav.component'
import { HeaderComponent } from '../../shared/components/header/header.component'
import { CardNoticiaComponent } from '../home/components/card-noticia/card-noticia.component'
import { CardExpComponent } from '../home/components/card-exp/card-exp.component'
import { TabsComponent } from '../home/components/tabs/tabs.component'
import { HomeService } from './services/home.service';

@Component({
  selector: 'app-home',
  imports: [NavComponent, HeaderComponent, CardNoticiaComponent, CardExpComponent, TabsComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss'
})
export class HomePage implements OnInit {
  homeService: HomeService = inject(HomeService);
  tabs!: any[];
  posts!: any[];

  constructor() { }

  ngOnInit(): void {
    this.homeService.getResourcesHome().subscribe((response) => {
      this.tabs = response.categories;
      this.posts = response.posts;
    });
  }

}
