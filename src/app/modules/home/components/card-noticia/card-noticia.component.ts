import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Category, Post } from '../../../../shared/interface/home.interface';
import { DecodeHtmlEntitiesPipe } from '../../../../shared/pipes/decode-html-entities.pipe';

@Component({
  selector: 'app-card-noticia',
  imports: [RouterLink, CommonModule, DecodeHtmlEntitiesPipe],
  templateUrl: './card-noticia.component.html',
  standalone: true,
  styleUrl: './card-noticia.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CardNoticiaComponent {
  @Input({ required: true }) post!: Post;
  /** Lista de categorias da home — usada quando `categoryName` vem vazio. */
  @Input() homeCategories: Category[] = [];

  get newsDestaque(): Post {
    return this.post;
  }

  get tagLabel(): string {
    const fromApi = (this.post.categoryName ?? '').trim();
    if (fromApi) return fromApi;
    const firstId = this.post.categories?.[0];
    if (firstId == null || !this.homeCategories.length) return '';
    const match = this.homeCategories.find((c) => c.id === firstId);
    return (match?.name ?? '').trim();
  }
}
