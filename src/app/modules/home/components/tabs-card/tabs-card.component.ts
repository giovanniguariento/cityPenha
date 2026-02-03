import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tabs-card',
  imports: [RouterLink],
  templateUrl: './tabs-card.component.html',
  styleUrl: './tabs-card.component.scss'
})
export class TabsCardComponent {
  @Input() card!: any;
  @Input() category!: string;
}
