import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { StoreData } from './shared/store/store';
import { MissionFeedbackService } from './shared/services/mission-feedback.service';
import { PwaService } from './shared/services/pwa.service';
import { InstallPromptComponent } from './shared/components/install-prompt/install-prompt.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, InstallPromptComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App implements OnInit {
  private readonly store = inject(StoreData, { optional: true });
  private readonly pwa = inject(PwaService);

  constructor() {
    inject(MissionFeedbackService);
  }

  ngOnInit(): void {
    this.store?.set('data', { name: 'City Penha', description: 'A beautiful city in Brazil' });
    this.pwa.init();
  }
}
