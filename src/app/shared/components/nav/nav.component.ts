import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Destroyable } from '../../utils/destroyable';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-nav',
  imports: [RouterLink],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NavComponent extends Destroyable {
  private readonly authService = inject(AuthService);
  readonly router = inject(Router);
  currentPath = signal<string>(this.router.url);
  photoURL = signal<string | null>(null);

  constructor() {
    super();
    this.authService.user$
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

  // teardown handled by Destroyable
}
