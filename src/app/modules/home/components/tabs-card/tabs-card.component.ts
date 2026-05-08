import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Post } from '../../../../shared/interface/home.interface';
import { DecodeHtmlEntitiesPipe } from '../../../../shared/pipes/decode-html-entities.pipe';

@Component({
  selector: 'app-tabs-card',
  imports: [CommonModule, RouterLink, DecodeHtmlEntitiesPipe],
  templateUrl: './tabs-card.component.html',
  styleUrl: './tabs-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TabsCardComponent {
  @Input({ required: true }) card!: Post;
  @Input({ required: true }) category!: string;
}
