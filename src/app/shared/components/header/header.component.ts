import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Auth } from '@angular/fire/auth';
import { EMPTY, from, switchMap } from 'rxjs';
import { LoginRequiredDialogComponent } from '../login-required-dialog/login-required-dialog.component';
import { APP_ASSETS } from '../../constants/app-assets';
import { FeedbackService } from '../../services/feedback.service';
import { HomeService } from '../../../modules/home/services/home.service';

@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly auth = inject(Auth);
  private readonly feedback = inject(FeedbackService);
  private readonly homeService = inject(HomeService);
  private readonly destroyRef = inject(DestroyRef);

  readonly logoUrl = APP_ASSETS.logo;
  readonly canCreatePosts = signal(false);

  ngOnInit(): void {
    from(this.auth.authStateReady())
      .pipe(
        switchMap(() => {
          if (!this.auth.currentUser) {
            this.canCreatePosts.set(false);
            return EMPTY;
          }
          return this.homeService.getMe();
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (me) => this.canCreatePosts.set(me.user.canCreatePosts === true),
        error: () => this.canCreatePosts.set(false),
      });
  }

  onCreatePostClick(): void {
    void this.router.navigate(['/criar-postagem']);
  }

  onFrequenciaClick(): void {
    const firebaseUser = this.auth.currentUser;
    if (firebaseUser) {
      this.router.navigate(['/frequencia']);
    } else {
      this.dialog.open(LoginRequiredDialogComponent, {
        data: {
          points: 10,
          actionLabel: 'acessar a frequência',
          noRedirect: true,
          isFrequencyContext: true,
        },
      });
    }
  }

  onNotificationsClick(): void {
    this.feedback.showComingSoon();
  }
}
