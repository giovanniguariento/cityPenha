import { Component, Input, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router'
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-card-noticia',
  imports: [RouterLink, CommonModule],
  templateUrl: './card-noticia.component.html',
  standalone: true,
  styleUrl: './card-noticia.component.scss'
})
export class CardNoticiaComponent implements OnInit {
  newsDestaque!: any;
  @Input() post!: any;

  constructor() { }

  ngOnInit(): void {
    // const random = Math.floor(Math.random() * (this.posts.length - 0 + 1));
    this.newsDestaque = this.post;
  }
}
