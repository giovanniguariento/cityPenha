import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { Post, FolderPostItem } from '../../../shared/interface/home.interface';
import { HomeService } from '../../home/services/home.service';
import { Auth } from '@angular/fire/auth';
import { TabsCardComponent } from '../../home/components/tabs-card/tabs-card.component';
import { NavComponent } from '../../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { decodeHtmlEntities } from '../../../shared/utils/decode-html-entities';

const PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=500&auto=format&fit=crop';

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim();
}

function mapFolderPostItem(item: FolderPostItem): Post {
  const p = item.post;
  let title = '';
  const rawTitle = p['title'];
  if (typeof rawTitle === 'string') {
    title = decodeHtmlEntities(stripHtml(rawTitle));
  } else if (rawTitle && typeof rawTitle === 'object' && 'rendered' in rawTitle) {
    title = decodeHtmlEntities(stripHtml(String((rawTitle as { rendered: string }).rendered)));
  }

  const slug =
    typeof p['slug'] === 'string' ? p['slug'] : String(p['id'] ?? item.wordpressPostId);

  const id = typeof p['id'] === 'number' ? p['id'] : item.wordpressPostId;

  const cats = Array.isArray(p['categories']) ? (p['categories'] as number[]) : [];
  const yoast = p['yoast_head_json'] as Record<string, unknown> | undefined;

  let image = PLACEHOLDER_IMAGE;
  if (typeof item.image === 'string' && item.image.trim()) {
    image = item.image.trim();
  } else {
    for (const k of ['image', 'featured_image_src', 'jetpack_featured_media_url'] as const) {
      const v = p[k];
      if (typeof v === 'string' && v) {
        image = v;
        break;
      }
    }
    if (image === PLACEHOLDER_IMAGE && yoast?.['og_image'] && Array.isArray(yoast['og_image'])) {
      const o0 = yoast['og_image'][0] as { url?: string } | undefined;
      if (typeof o0?.url === 'string' && o0.url) {
        image = o0.url;
      }
    }
  }

  const yoastAuthor = yoast?.['author'];
  const authorName = typeof yoastAuthor === 'string' ? yoastAuthor : 'Autor';

  const readingTime =
    typeof p['readingTime'] === 'number'
      ? p['readingTime']
      : typeof p['read_time'] === 'number'
        ? (p['read_time'] as number)
        : 0;

  const categoryName =
    item.categories.length > 0 ? item.categories[0].name : 'Geral';

  const categorySlug =
    typeof p['categorySlug'] === 'string' ? p['categorySlug'] : categoryName.toLowerCase().replace(/\s+/g, '-');

  return {
    slug,
    id,
    title: title || 'Sem título',
    author: {
      name: authorName,
      avatarUrl: PLACEHOLDER_IMAGE,
    },
    tags: Array.isArray(p['tags']) ? (p['tags'] as number[]) : [],
    readingTime: readingTime || 3,
    image,
    categories: cats,
    categoryName,
    categorySlug,
    onlyVideo: typeof p['onlyVideo'] === 'boolean' ? p['onlyVideo'] : false,
  };
}

@Component({
  selector: 'app-category',
  imports: [RouterLink, TabsCardComponent, NavComponent, LegalFooterComponent],
  templateUrl: './category.page.html',
  styleUrl: './category.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CategoryPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly homeService = inject(HomeService);
  private readonly auth = inject(Auth);

  readonly posts = signal<Post[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly folderTitle = signal<string>('Artigos');

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const folderId = params.get('folderId');
          if (!folderId || !this.auth.currentUser) {
            this.loading.set(false);
            this.error.set(!this.auth.currentUser ? 'Faça login para ver esta pasta.' : 'Pasta inválida.');
            return of<null>(null);
          }
          this.loading.set(true);
          this.error.set(null);
          return this.homeService.getFolderPosts(folderId).pipe(
            catchError(() => of<null>(null))
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (res === null) {
          if (!this.error()) {
            this.error.set('Não foi possível carregar os artigos.');
          }
          this.posts.set([]);
          return;
        }
        if (res?.posts?.length) {
          this.posts.set(res.posts.map(mapFolderPostItem));
        } else if (res?.posts) {
          this.posts.set([]);
        } else {
          this.posts.set([]);
        }
      });
  }

  ngOnInit(): void {
    const st = history.state as { folderName?: string } | undefined;
    if (st?.folderName) {
      this.folderTitle.set(st.folderName);
    }
  }

  trackByPostId(_index: number, post: Post): number | string {
    return post.id || post.slug;
  }
}
