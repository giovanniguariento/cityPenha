import { inject, Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user, User, UserCredential } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth: Auth = inject(Auth);
  readonly user$: Observable<User | null>;

  constructor() {
    this.user$ = user(this.auth);
  }

  async loginWithGoogle(): Promise<UserCredential> {
    const provider = new GoogleAuthProvider();
    try {
      const authentication = await signInWithPopup(this.auth, provider);
      const user = authentication.user;
      if (!user) {
        throw new Error('Google-Login error: No user returned');
      }
      return authentication;
    } catch (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    try {
      localStorage.removeItem('userId');
    } catch {
      // ignore storage errors
    }
    return await signOut(this.auth);
  }
}
