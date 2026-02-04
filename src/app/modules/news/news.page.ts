import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HomeService } from '../home/services/home.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { takeUntil } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { PostDetail } from '../../shared/interface/home.interface';
import { Destroyable } from '../../shared/utils/destroyable';

@Component({
  selector: 'app-news-page',
  imports: [RouterLink, CommonModule],
  templateUrl: './news.page.html',
  styleUrl: './news.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewsPageComponent extends Destroyable implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly sanitizer = inject(DomSanitizer);
  private scrollHandler?: () => void;

  news = signal<PostDetail | null>(null);
  following = signal<boolean>(false);
  bookmarked = signal<boolean>(false);
  readingTime = signal<number>(0);

  constructor() {
    super();
    this.activatedRoute.params
      .pipe(
        switchMap((params) => this.homeService.getPost(params['slug'])),
        takeUntil(this.destroy$)
      )
      .subscribe((post) => {
        const sanitizedPost: PostDetail = {
          ...post,
          content: typeof post.content === 'string'
            ? this.sanitizer.bypassSecurityTrustHtml(post.content)
            : post.content
        };
        this.news.set(sanitizedPost);
      });
  }

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

  override ngOnDestroy(): void {
    // call base teardown for destroy$
    super.ngOnDestroy();
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
    }
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
