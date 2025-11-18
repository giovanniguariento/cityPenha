import { Component, Input } from '@angular/core';
import { FeedItem } from '../../../../shared/interface/home.interface';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tabs-card',
  imports: [RouterLink],
  templateUrl: './tabs-card.component.html',
  styleUrl: './tabs-card.component.scss'
})
export class TabsCardComponent {
  @Input() card!: FeedItem;

}
