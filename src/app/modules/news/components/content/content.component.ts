import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit, OnDestroy, signal } from '@angular/core';
import { PostDetail } from '../../../../shared/interface/home.interface';

@Component({
  selector: 'app-content',
  imports: [CommonModule],
  templateUrl: './content.component.html',
  styleUrl: './content.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContentComponent implements OnInit, OnDestroy {
  @Input({ required: true }) news!: PostDetail;

  following = signal<boolean>(false);
  bookmarked = signal<boolean>(false);
  readingTime = signal<number>(0);
  private scrollHandler?: () => void;

  ngOnInit(): void {
    this.scrollHandler = () => {
      const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;

      let scrolled = (winScroll / height) * 100;
      if (height - winScroll <= 60) {
        scrolled = 100;
      }

      this.readingTime.set(Math.min(100, Math.max(0, scrolled)));
    };

    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  ngOnDestroy(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
  }

  getBackgroundImageUrl(): string {
    return this.news?.img ? `url('${this.news.img}')` : '';
  }

  async share(): Promise<void> {
    if (!navigator.share) {
      return;
    }

    try {
      const shareData = {
        title: 'Acesse o CityPenha',
        text: 'Veja agora essa noticia',
        url: window.location.href,
      };
      await navigator.share(shareData);
    } catch (error) {
      // User cancelled or error occurred - silently fail
      if (error instanceof Error && error.name !== 'AbortError') {
        // Could log to error service in production
      }
    }
  }
}
