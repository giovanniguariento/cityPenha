import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-xp-badge',
  standalone: true,
  template: `<span class="xp-badge" [class.xp-badge--on-dark]="onDark()">+{{ amount() }} XP</span>`,
  styles: `
    :host {
      display: inline-flex;
    }

    .xp-badge {
      display: inline-flex;
      align-items: center;
      border: 1px solid #ff1500;
      border-radius: 20px;
      padding: 7px 20px;
      font-family: Lato, sans-serif;
      font-weight: 500;
      font-size: 16px;
      line-height: 100%;
      color: #ff1500;
      background: transparent;
      white-space: nowrap;
    }

    .xp-badge--on-dark {
      border: none;
      padding: 0;
      font-size: 14px;
      font-weight: 700;
      text-shadow: 0 1px 3px rgba(0, 0, 0, 0.55);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class XpBadgeComponent {
  readonly amount = input.required<number>();
  /** Compact red label over images (carousel / list thumb). */
  readonly onDark = input(false);
}
