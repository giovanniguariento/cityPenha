import { isPlatformServer } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { StoreData } from './shared/store/store';
import { MissionFeedbackService } from './shared/services/mission-feedback.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  constructor(private store: StoreData) {
    if (!isPlatformServer(inject(PLATFORM_ID))) {
      inject(MissionFeedbackService);
    }
  }

  ngOnInit(): void {
    this.store.set('data', { name: 'City Penha', description: 'A beautiful city in Brazil' });
  }
}
