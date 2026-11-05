import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-detail-sheet',
  standalone: true,
  template: `<div class="detail-sheet"><ng-content /></div>`,
  styles: `
    :host {
      display: block;
    }

    .detail-sheet {
      background-color: #fcfcfc;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 0 32px 32px;
      min-height: 40vh;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailSheetComponent {}
