import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-news-skeleton',
  standalone: true,
  templateUrl: './news-skeleton.component.html',
  styleUrl: './news-skeleton.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsSkeletonComponent {}
