import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../shared/services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserStateService {
  private readonly authService = inject(AuthService);

  // Expose the firebase auth user$ so components can reuse it
  readonly user$ = this.authService.user$;

  getUserIdFromStorage(): string | null {
    try {
      return localStorage.getItem('userId');
    } catch {
      return null;
    }
  }

  setUserIdToStorage(id: string): void {
    try {
      localStorage.setItem('userId', id);
    } catch {
      // ignore storage errors
    }
  }
}

