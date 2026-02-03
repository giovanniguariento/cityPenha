import { inject, Injectable } from '@angular/core';
import { catchError, Observable, shareReplay, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { BlogResponse } from '../../../shared/interface/home.interface';
import { UserCredential } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private http = inject(HttpClient);
  private dadosCache$: Observable<BlogResponse> | null = null;

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

  getPost(slug: string) {
    return this.http.get<any>(`${environment.apiUrl}/post/${slug}`);
  }

  signup(firebaseUser: UserCredential) {
    return this.http.post<any>(`${environment.apiUrl}/user/signup`, {
      email: firebaseUser.user.email,
      firebaseUid: firebaseUser.user.uid,
      name: firebaseUser.user.displayName,
      photoUrl: firebaseUser.user.photoURL
    })
  }
}
