import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-nav',
  imports: [RouterLink],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss',
  standalone: true,
})
export class NavComponent implements OnInit {
  private authService: AuthService = inject(AuthService);
  router = inject(Router);
  currentPath = this.router.url;
  photoURL: string | null | undefined = null;

  ngOnInit(): void {
    this.authService.user$.subscribe((user) => {
      this.photoURL = user?.photoURL;
    });
  }
}
