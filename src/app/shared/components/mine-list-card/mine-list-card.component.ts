import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'li[app-mine-list-card]',
  standalone: true,
  templateUrl: './mine-list-card.component.html',
  styleUrl: './mine-list-card.component.scss',
  host: {
    class: 'mine-card',
    '[class.mine-card--busy]': 'busy()',
  },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MineListCardComponent {
  readonly title = input('');
  readonly thumbnailUrl = input<string | null>(null);
  readonly subtitleParts = input<string[]>([]);
  readonly excerpt = input<string | null>(null);
  readonly showPlayBadge = input(false);
  readonly busy = input(false);
  readonly menuOpen = input(false);
  readonly deleteDisabled = input(false);

  readonly open = output<void>();
  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly menuToggle = output<Event>();
}
