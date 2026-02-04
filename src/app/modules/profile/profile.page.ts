import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Destroyable } from '../../shared/utils/destroyable';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { AuthService } from '../../shared/services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { takeUntil } from 'rxjs';
import { User, UserStat } from '../../shared/interface/home.interface';

@Component({
  selector: 'app-profile',
  imports: [NavComponent, CommonModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProfilePage extends Destroyable {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  user = signal<User>({
    name: 'Júlia Guimarães',
    role: 'Redatora & RP',
    description: 'Narrativas que conectam e encantam.',
    level: 5,
    avatarUrl: 'https://i.pravatar.cc/150?img=5'
  });

  readonly stats: UserStat[] = [
    { value: '05', label: 'Dias seguidos', icon: '⚡', color: '#ff3b30' },
    { value: '400', label: 'Total de XP', icon: '✚', color: '#ff3b30' },
    { value: 'Sentinela', label: 'Cultural', icon: '🛡️', color: '#ff3b30' },
    { value: '58', label: 'Missões', icon: '🎖️', color: '#ff3b30' }
  ];

  constructor() {
    super();
    this.authService.user$
      .pipe(takeUntil(this.destroy$))
      .subscribe((user) => {
        this.user.update(current => ({
          ...current,
          avatarUrl: user?.photoURL || current.avatarUrl,
          name: user?.displayName || current.name
        }));
      });
  }

  // teardown handled by Destroyable

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/home']);
  }
}
