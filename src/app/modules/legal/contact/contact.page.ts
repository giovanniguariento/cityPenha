import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { SeoService } from '../../../shared/services/seo.service';
import { SITE_URL } from '../../../shared/constants/site-url';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [RouterLink, LegalFooterComponent],
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage implements OnInit {
  private readonly seoService = inject(SeoService);

  ngOnInit(): void {
    this.seoService.setPage({
      title: 'Contato',
      description:
        'Fale com a equipe do CityPenha Digital: suporte, sugestões editoriais e contato institucional da Inventy Editora.',
      url: `${SITE_URL}/contato`,
      type: 'website',
    });
  }
}
