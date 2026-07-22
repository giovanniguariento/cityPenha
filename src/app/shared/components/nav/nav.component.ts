import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Destroyable } from '../../utils/destroyable';
import { Router, RouterLink } from '@angular/router';
import { takeUntil } from 'rxjs';
import { UserStateService } from '../../../core/state/user-state.service';
import { FeedbackService } from '../../services/feedback.service';

@Component({
  selector: 'app-nav',
  imports: [RouterLink],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavComponent extends Destroyable {
  private readonly userState = inject(UserStateService);
  private readonly feedback = inject(FeedbackService);
  readonly router = inject(Router);
  currentPath = signal<string>(this.router.url);
  photoURL = signal<string | null>(null);

  constructor() {
    super();
    this.userState.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.photoURL.set(user?.photoURL || null);
      });

    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPath.set(this.router.url);
      });
  }

  onQrCodeClick(): void {
    this.feedback.showComingSoon();
  }
}
