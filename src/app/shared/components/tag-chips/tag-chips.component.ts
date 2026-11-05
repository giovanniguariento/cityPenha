import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-tag-chips',
  standalone: true,
  template: `
    @if (tags().length) {
      <div class="tag-chips" role="list">
        @for (tag of tags(); track tag) {
          <span class="tag-chips__item" role="listitem">{{ tag }}</span>
        }
      </div>
    }
  `,
  styles: `
    .tag-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
    }

    .tag-chips__item {
      display: inline-flex;
      align-items: center;
      padding: 8px 14px;
      border-radius: 9999px;
      background: #f2f2f2;
      font-family: Lato, sans-serif;
      font-weight: 500;
      font-size: 13px;
      line-height: 1;
      color: #4a4a4a;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TagChipsComponent {
  readonly tags = input<string[]>([]);
}
