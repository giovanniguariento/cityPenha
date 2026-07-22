import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component';
import { RouterLink } from '@angular/router';
import { CategoryCard, UserFolder } from '../../shared/interface/home.interface';
import { HomeService } from '../home/services/home.service';
import { Auth } from '@angular/fire/auth';
import { SeoService } from '../../shared/services/seo.service';
import { SITE_URL } from '../../shared/constants/site-url';

const FOLDER_CARD_PLACEHOLDER_IMAGE =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=500&auto=format&fit=crop';

function folderToCategoryCard(folder: UserFolder): CategoryCard {
  return {
    id: folder.id,
    title: folder.name,
    count: folder.itemCount ?? 0,
    image: folder.coverImageUrl ?? FOLDER_CARD_PLACEHOLDER_IMAGE,
  };
}

@Component({
  selector: 'app-favorites',
  standalone: true,
  imports: [NavComponent, LegalFooterComponent, RouterLink],
  templateUrl: './favorites.page.html',
  styleUrl: './favorites.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FavoritesPage implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly auth = inject(Auth);
  private readonly destroyRef = inject(DestroyRef);
  private readonly seo = inject(SeoService);

  readonly categories = signal<CategoryCard[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.seo.setNoIndexPage({
      title: 'Biblioteca',
      description: 'Suas pastas e notícias salvas no CityPenha.',
      url: `${SITE_URL}/favorites`,
    });
  }
  ngOnInit(): void {
    if (!this.auth.currentUser) {
      this.loading.set(false);
      this.error.set('Faça login para ver suas pastas.');
      return;
    }
    this.homeService
      .getUserFolders()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (folders) => {
        if (Array.isArray(folders)) {
          this.categories.set(folders.map(folderToCategoryCard));
        } else {
          this.categories.set([]);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Não foi possível carregar suas pastas.');
      },
    });
  }
}
