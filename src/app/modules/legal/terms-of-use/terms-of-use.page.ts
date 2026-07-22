import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { SeoService } from '../../../shared/services/seo.service';
import { SITE_URL } from '../../../shared/constants/site-url';

@Component({
  selector: 'app-terms-of-use',
  standalone: true,
  imports: [RouterLink, LegalFooterComponent],
  templateUrl: './terms-of-use.page.html',
  styleUrl: './terms-of-use.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TermsOfUsePage implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setPage({
      title: 'Termos de Uso',
      description:
        'Termos de Uso do portal CityPenha Digital, operado pela Inventy Editora.',
      url: `${SITE_URL}/termos-de-uso`,
      type: 'website',
    });
  }
}
