import { Component, inject, OnInit } from '@angular/core';
import { NavComponent } from '../../shared/components/nav/nav.component';
import { AuthService } from '../../shared/services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  imports: [NavComponent, CommonModule],
  templateUrl: './profile.page.html',
  styleUrl: './profile.page.scss'
})
export class ProfilePage implements OnInit {
  private router: Router = inject(Router);
  private authService: AuthService = inject(AuthService);
  // Dados simulados para o template
  user: any = {
    name: 'Júlia Guimarães',
    role: 'Redatora & RP',
    description: 'Narrativas que conectam e encantam.',
    level: 5,
    avatarUrl: 'https://i.pravatar.cc/150?img=5' // Placeholder
  };

  stats = [
    { value: '05', label: 'Dias seguidos', icon: '⚡', color: '#ff3b30' },
    { value: '400', label: 'Total de XP', icon: '✚', color: '#ff3b30' },
    { value: 'Sentinela', label: 'Cultural', icon: '🛡️', color: '#ff3b30' },
    { value: '58', label: 'Missões', icon: '🎖️', color: '#ff3b30' }
  ];

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.user.avatarUrl = user?.photoURL;
      this.user.name = user?.displayName;
    })
  }

  logout() {
    this.authService.logout();
    this.router.navigate(["/home"])
  }
}
