import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../shared/services/seo.service';
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component';
import { APP_ASSETS } from '../../shared/constants/app-assets';
import { SITE_URL } from '../../shared/constants/site-url';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, LegalFooterComponent],
  templateUrl: './not-found.page.html',
  styleUrl: './not-found.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {
  private readonly seo = inject(SeoService);
  readonly logoUrl = APP_ASSETS.logo;

  constructor() {
    this.seo.setNoIndexPage({
      title: 'Página não encontrada',
      description: 'A página que você procura não existe ou foi movida.',
      url: `${SITE_URL}/404`,
    });
  }
}
