import { inject, Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BlogResponse, PostDetail, SignupRequest, SignupResponse } from '../../../shared/interface/home.interface';
import { UserCredential } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly http = inject(HttpClient);
  private dadosCache$: Observable<BlogResponse> | null = null;
  private readonly postCache = new Map<string, Observable<PostDetail>>();

  getResourcesHome(): Observable<BlogResponse> {
    if (!this.dadosCache$) {
      this.dadosCache$ = this.http.get<BlogResponse>(`${environment.apiUrl}/home`).pipe(
        shareReplay(1),
        catchError(err => {
          this.dadosCache$ = null;
          return throwError(() => err);
        })
      );
    }

    return this.dadosCache$;
  }

  getPost(slug: string): Observable<PostDetail> {
    if (!this.postCache.has(slug)) {
      const post$ = this.http.get<PostDetail>(`${environment.apiUrl}/post/${slug}`).pipe(
        shareReplay(1),
        catchError(err => {
          this.postCache.delete(slug);
          return throwError(() => err);
        })
      );
      this.postCache.set(slug, post$);
    }
    return this.postCache.get(slug)!;
  }

  signup(firebaseUser: UserCredential): Observable<SignupResponse> {
    const signupData: SignupRequest = {
      email: firebaseUser.user.email,
      firebaseUid: firebaseUser.user.uid,
      name: firebaseUser.user.displayName,
      photoUrl: firebaseUser.user.photoURL
    };

    return this.http.post<SignupResponse>(`${environment.apiUrl}/user/signup`, signupData);
  }
}
