import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Post } from '../../../../shared/interface/home.interface';

@Component({
  selector: 'app-tabs-card',
  imports: [RouterLink],
  templateUrl: './tabs-card.component.html',
  styleUrl: './tabs-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabsCardComponent {
  @Input({ required: true }) card!: Post;
  @Input({ required: true }) category!: string;
}
