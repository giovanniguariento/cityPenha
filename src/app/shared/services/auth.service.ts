import { inject, Injectable } from '@angular/core';
import { Auth, GoogleAuthProvider, signInWithPopup, signOut, user, User, UserCredential } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private auth: Auth = inject(Auth);
  authentication!: UserCredential
  user$: Observable<User | null>;

  constructor() {
    this.user$ = user(this.auth);
  }

  async loginWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    try {
      this.authentication = await signInWithPopup(this.auth, provider);
      const user = this.authentication.user;
      if (!user) {
        throw new Error('Google-Login error');
      }
    } catch (error) {
      console.error('Google-Login error:', error);
      throw error;
    }
  }

  async logout(): Promise<void> {
    return await signOut(this.auth);
  }
}
