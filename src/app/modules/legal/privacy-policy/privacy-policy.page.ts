import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { SeoService } from '../../../shared/services/seo.service';
import { SITE_URL } from '../../../shared/constants/site-url';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [RouterLink, LegalFooterComponent],
  templateUrl: './privacy-policy.page.html',
  styleUrl: './privacy-policy.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrivacyPolicyPage implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setPage({
      title: 'Política de Privacidade',
      description:
        'Política de Privacidade e Proteção de Dados da Inventy Editora / CityPenha, em conformidade com a LGPD.',
      url: `${SITE_URL}/politica-de-privacidade`,
      type: 'website',
    });
  }
}
