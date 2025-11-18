import { Component, inject, OnInit } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TabsCardComponent } from '../tabs-card/tabs-card.component';
import { HomeService } from '../../services/home.service';
import { ContentTab } from '../../../../shared/interface/home.interface';

@Component({
  selector: 'app-tabs',
  imports: [MatTabsModule, TabsCardComponent],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent implements OnInit {
  homeService: HomeService = inject(HomeService);
  tabs!: ContentTab[];


  constructor() { }

  ngOnInit(): void {
    this.homeService.getResourcesHome().subscribe(({ contentSection }) => {
      this.tabs = contentSection.tabs;
    });
  }

}
