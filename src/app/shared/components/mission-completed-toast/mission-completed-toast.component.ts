import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_SNACK_BAR_DATA } from '@angular/material/snack-bar';

export interface MissionCompletedToastData {
  title: string;
  coinReward: number;
  xpReward: number;
}

@Component({
  selector: 'app-mission-completed-toast',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './mission-completed-toast.component.html',
  styleUrl: './mission-completed-toast.component.scss',
})
export class MissionCompletedToastComponent {
  constructor(@Inject(MAT_SNACK_BAR_DATA) public data: MissionCompletedToastData) {}

  get hasRewards(): boolean {
    return ((this.data.coinReward ?? 0) > 0) || ((this.data.xpReward ?? 0) > 0);
  }
}
