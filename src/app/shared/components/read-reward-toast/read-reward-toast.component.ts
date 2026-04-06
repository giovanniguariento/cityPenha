import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

@Component({
  selector: 'app-read-reward-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-root">
      <span class="emoji" aria-hidden="true">✨</span>
      <div class="text">
        Você ganhou {{ data?.points ?? 10 }} pontos!
      </div>
    </div>
  `,
  styles: [`
    .toast-root { display:flex; align-items:center; gap:10px; color: var(--mat-snack-bar-supporting-text, #2f2f2f); }
    .emoji { display:inline-block; font-size:20px; transform-origin:center; animation: pop 900ms infinite; }
    .text { font-weight:600; }
    @keyframes pop {
      0% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-6px) scale(1.25) rotate(-8deg); }
      100% { transform: translateY(0) scale(1); }
    }
  `]
})
export class ReadRewardToastComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: { points?: number }) { }
}

