import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Post } from '../../../../shared/interface/home.interface';

@Component({
  selector: 'app-card-noticia',
  imports: [RouterLink, CommonModule],
  templateUrl: './card-noticia.component.html',
  standalone: true,
  styleUrl: './card-noticia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardNoticiaComponent {
  @Input({ required: true }) post!: Post;

  get newsDestaque(): Post {
    return this.post;
  }
}
