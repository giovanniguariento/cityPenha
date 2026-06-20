import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformServer } from '@angular/common';
import {
  Auth,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  user,
  User,
  UserCredential,
} from '@angular/fire/auth';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly auth: Auth = inject(Auth);
  readonly user$: Observable<User | null>;

  constructor() {
    this.user$ = isPlatformServer(inject(PLATFORM_ID)) ? of(null) : user(this.auth);
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

  async loginWithEmail(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email.trim(), password);
  }

  async sendPasswordResetEmail(email: string): Promise<void> {
    await firebaseSendPasswordResetEmail(this.auth, email.trim());
  }

  async signUpWithEmail(
    email: string,
    password: string,
    displayName: string
  ): Promise<UserCredential> {
    const credential = await createUserWithEmailAndPassword(
      this.auth,
      email.trim(),
      password
    );
    await updateProfile(credential.user, { displayName: displayName.trim() });
    return credential;
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
