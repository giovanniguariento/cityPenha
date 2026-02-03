import { Component, Input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TabsCardComponent } from '../tabs-card/tabs-card.component';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-tabs',
  imports: [MatTabsModule, TabsCardComponent, CommonModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss'
})
export class TabsComponent {
  @Input() tabs!: any[];

  constructor() { }
}
