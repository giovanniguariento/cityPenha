import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-content',
  imports: [CommonModule],
  templateUrl: './content.component.html',
  styleUrl: './content.component.scss'
})
export class ContentComponent implements OnInit {
  @Input() news!: any;

  following: boolean = false;
  bookmarked: boolean = false;

  readingTime: number = 0;

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
