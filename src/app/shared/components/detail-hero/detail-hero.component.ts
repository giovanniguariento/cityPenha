import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-detail-hero',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './detail-hero.component.html',
  styleUrl: './detail-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailHeroComponent {
  readonly imageUrl = input.required<string>();
  readonly backHref = input('/home');
  readonly backAriaLabel = input('Voltar');
  readonly shareAriaLabel = input('Compartilhar');

  readonly share = output<void>();
}
