import { Auth } from '@angular/fire/auth';

/** Minimal Auth stub for SSR — avoids Firebase SDK listeners and storage on the server. */
export const serverAuthStub = {
  authStateReady: () => Promise.resolve(),
  currentUser: null,
} as Auth;
