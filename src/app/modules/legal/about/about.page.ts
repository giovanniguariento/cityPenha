import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { SeoService } from '../../../shared/services/seo.service';
import { SITE_URL } from '../../../shared/constants/site-url';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [RouterLink, LegalFooterComponent],
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setPage({
      title: 'Sobre Nós',
      description:
        'Conheça o CityPenha Digital: plataforma de comunicação e engajamento operada pela Inventy Editora.',
      url: `${SITE_URL}/sobre-nos`,
      type: 'website',
    });
  }
}
