import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-home-skeleton',
  standalone: true,
  templateUrl: './home-skeleton.component.html',
  styleUrl: './home-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeSkeletonComponent {}
