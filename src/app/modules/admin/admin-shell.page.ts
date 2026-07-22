import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs/operators';
import { AuthService } from '../../shared/services/auth.service';
import { UserStateService } from '../../core/state/user-state.service';
import { APP_ASSETS } from '../../shared/constants/app-assets';
import { LegalFooterComponent } from '../../shared/components/legal-footer/legal-footer.component';

interface AdminNavItem {
  label: string;
  path: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-admin-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, LegalFooterComponent],
  templateUrl: './admin-shell.page.html',
  styleUrl: './admin-shell.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShellPage {
  private static readonly THEME_STORAGE_KEY = 'admin-theme-mode';
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly userState = inject(UserStateService);

  readonly navItems: AdminNavItem[] = [
    { label: 'Visão geral', path: 'dashboard', icon: 'home', description: 'Resumo do painel' },
    { label: 'Missões', path: 'missions', icon: 'target', description: 'CRUD de missões' },
    { label: 'Insígnias', path: 'badges', icon: 'medal', description: 'CRUD de insígnias' },
    { label: 'Levels', path: 'levels', icon: 'layers', description: 'CRUD de levels' },
    { label: 'Ledger', path: 'ledger', icon: 'list', description: 'Auditoria de recompensas' },
    { label: 'Recompute', path: 'recompute', icon: 'refresh', description: 'Reavaliar usuário' },
    {
      label: 'Acesso WordPress',
      path: 'wordpress-access',
      icon: 'wordpress',
      description: 'Credenciais WP dos usuários',
    },
  ];

  readonly logoUrl = APP_ASSETS.logo;
  readonly sidebarOpen = signal(false);
  readonly isDarkMode = signal(this.loadDarkModePreference());

  readonly currentUser = toSignal(this.userState.user$, { initialValue: null });

  /** Mantém a label/breadcrumb sincronizada com a rota ativa. */
  readonly currentSection = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        const url = this.router.url.split('?')[0];
        return this.navItems.find((it) => url.startsWith(`/admin/${it.path}`)) ?? this.navItems[0];
      })
    ),
    { initialValue: this.navItems[0] }
  );

  readonly isFormRoute = computed(() => {
    const url = this.router.url;
    return /\/(new|[0-9a-f-]{16,})$/.test(url);
  });

  toggleSidebar(): void {
    this.sidebarOpen.update((v) => !v);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  toggleDarkMode(): void {
    const next = !this.isDarkMode();
    this.isDarkMode.set(next);
    localStorage.setItem(AdminShellPage.THEME_STORAGE_KEY, next ? 'dark' : 'light');
  }

  async logout(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/home']);
  }

  private loadDarkModePreference(): boolean {
    return localStorage.getItem(AdminShellPage.THEME_STORAGE_KEY) === 'dark';
  }
}
