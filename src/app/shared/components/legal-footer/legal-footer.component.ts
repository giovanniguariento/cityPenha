import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-legal-footer',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './legal-footer.component.html',
  styleUrl: './legal-footer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LegalFooterComponent {
  /** Extra bottom space when the page has the fixed bottom tab bar. */
  readonly aboveNav = input(false);
}
