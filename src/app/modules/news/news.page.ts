import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router'
import { HomeService } from '../home/services/home.service';
import { DomSanitizer } from '@angular/platform-browser';

@Component({
  selector: 'app-news-page',
  imports: [RouterLink, CommonModule],
  templateUrl: './news.page.html',
  styleUrl: './news.page.scss'
})
export class NewsPageComponent implements OnInit {
  homeService: HomeService = inject(HomeService);
  activatedRoute = inject(ActivatedRoute);
  newsId: string = "";
  news: any;
  following: boolean = false;
  bookmarked: boolean = false;

  readingTime: number = 0;


  constructor(private sanitizer: DomSanitizer) {
    this.activatedRoute.params.subscribe((params) => {
      this.homeService.getPost(params['slug']).subscribe((post) => {
        post.content = this.sanitizer.bypassSecurityTrustHtml(post.content);
        this.news = post;
      })
    });
  }

  ngOnInit(): void {
    window.addEventListener('scroll', () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;

      let scrolled = (winScroll / height) * 100;
      if (height - winScroll <= 60) {
        scrolled = 100;
      }

      this.readingTime = Math.min(100, Math.max(0, scrolled));
    });
  }

  getBackgroundImageUrl(): string {
    return `url('${this.news.img}')`;
  }

  async share(): Promise<void> {
    try {
      const shareData = {
        title: "Acesse o CityPenha",
        text: "Veja agora essa noticia",
        url: window.location.href,
      };
      await navigator.share(shareData);
    } catch (error) {
      alert(error)
    }
  }
}
