import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TabsCardComponent } from '../tabs-card/tabs-card.component';
import { CommonModule } from '@angular/common';
import { Category, Post } from '../../../../shared/interface/home.interface';

@Component({
  selector: 'app-tabs',
  imports: [MatTabsModule, TabsCardComponent, CommonModule],
  templateUrl: './tabs.component.html',
  styleUrl: './tabs.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabsComponent {
  @Input({ required: true }) tabs!: Category[];

  trackByTabId(_index: number, tab: Category): number {
    return tab.id;
  }

  trackByCardId(_index: number, card: Post): number | string {
    return card.id || card.slug;
  }
}
