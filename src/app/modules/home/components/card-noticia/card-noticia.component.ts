import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'
import { ids } from '../../../news/news.page';


@Component({
  selector: 'app-card-noticia',
  imports: [RouterLink],
  templateUrl: './card-noticia.component.html',
  standalone: true,
  styleUrl: './card-noticia.component.scss'
})
export class CardNoticiaComponent {
  newsId;
  newsDestaque;

  constructor() {
    const idsDestaque = ["artigo-100", "artigo-101", "artigo-102", "artigo-103", "artigo-104"]
    const random = Math.floor(Math.random() * (4 - 0 + 1));
    this.newsId = idsDestaque[random];
    this.newsDestaque = ids[this.newsId]
  }
}
