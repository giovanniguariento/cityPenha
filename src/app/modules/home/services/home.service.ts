import { isPlatformServer } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { catchError, map, Observable, OperatorFunction, shareReplay, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  ApiSuccessEnvelope,
  BackendUser,
  BlogResponse,
  DiscoveryResponse,
  FolderPostMutationPayload,
  FolderPostsData,
  FrequencyData,
  MissionApiItem,
  PostDetail,
  PostLikePayload,
  ReadPostResult,
  SignupRequest,
  UpdateMeRequest,
  UserFolder,
  UserMePayload,
} from '../../../shared/interface/home.interface';
import { UserCredential } from '@angular/fire/auth';

const SIGNUP_PLACEHOLDER_PHOTO =
  'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y&s=200';

@Injectable({
  providedIn: 'root',
})
export class HomeService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private dadosCache$: Observable<BlogResponse> | null = null;
  private readonly postCache = new Map<string, Observable<PostDetail>>();

  private unwrapData<T>(): OperatorFunction<ApiSuccessEnvelope<T>, T> {
    return map((r) => r.data);
  }

  /** SSR reuses one ApplicationRef; avoid retaining feed/post streams in root singleton. */
  private isServer(): boolean {
    return isPlatformServer(this.platformId);
  }

  getResourcesHome(): Observable<BlogResponse> {
    if (this.isServer()) {
      return this.http
        .get<ApiSuccessEnvelope<BlogResponse>>(`${environment.apiUrl}/home`)
        .pipe(this.unwrapData<BlogResponse>());
    }

    if (!this.dadosCache$) {
      this.dadosCache$ = this.http
        .get<ApiSuccessEnvelope<BlogResponse>>(`${environment.apiUrl}/home`)
        .pipe(
          this.unwrapData<BlogResponse>(),
          shareReplay(1),
          catchError((err) => {
            this.dadosCache$ = null;
            return throwError(() => err);
          })
        );
    }

    return this.dadosCache$;
  }

  /** Próximo GET /home fará nova requisição (ex.: após registrar leitura). */
  invalidateHomeFeedCache(): void {
    this.dadosCache$ = null;
  }

  /**
   * GET /discovery — optionalAuth; query `worldNewsCategories` opcional (IDs/slugs separados por vírgula).
   */
  getDiscovery(worldNewsCategories?: string): Observable<DiscoveryResponse> {
    let params = new HttpParams();
    const q = worldNewsCategories?.trim();
    if (q) {
      params = params.set('worldNewsCategories', q);
    }
    return this.http
      .get<ApiSuccessEnvelope<DiscoveryResponse>>(`${environment.apiUrl}/discovery`, { params })
      .pipe(this.unwrapData<DiscoveryResponse>());
  }

  /**
   * GET /post/:slug — estado do usuário via Bearer (optionalAuth).
   */
  getPost(slug: string): Observable<PostDetail> {
    if (this.isServer()) {
      return this.http
        .get<ApiSuccessEnvelope<PostDetail>>(`${environment.apiUrl}/post/${encodeURIComponent(slug)}`)
        .pipe(this.unwrapData<PostDetail>());
    }

    if (!this.postCache.has(slug)) {
      const post$ = this.http
        .get<ApiSuccessEnvelope<PostDetail>>(`${environment.apiUrl}/post/${encodeURIComponent(slug)}`)
        .pipe(
          this.unwrapData<PostDetail>(),
          shareReplay(1),
          catchError((err) => {
            this.postCache.delete(slug);
            return throwError(() => err);
          })
        );
      this.postCache.set(slug, post$);
    }
    return this.postCache.get(slug)!;
  }

  invalidatePostCache(slug: string): void {
    this.postCache.delete(slug);
  }

  signup(firebaseUser: UserCredential): Observable<BackendUser> {
    const u = firebaseUser.user;
    const signupData: SignupRequest = {
      email: u.email ?? '',
      firebaseUid: u.uid,
      name: u.displayName?.trim() || 'Usuário',
      photoUrl: (u.photoURL && u.photoURL.trim()) || SIGNUP_PLACEHOLDER_PHOTO,
    };

    return this.http
      .post<ApiSuccessEnvelope<BackendUser>>(`${environment.apiUrl}/user/signup`, signupData)
      .pipe(this.unwrapData<BackendUser>());
  }

  /**
   * POST /user/read/:postId — corpo opcional `{ slug? }`; usuário pelo token.
   */
  markPostRead(postId: number, slug?: string): Observable<ReadPostResult> {
    const body = slug ? { slug } : {};
    return this.http
      .post<ApiSuccessEnvelope<ReadPostResult>>(`${environment.apiUrl}/user/read/${postId}`, body)
      .pipe(this.unwrapData<ReadPostResult>());
  }

  /**
   * POST /post/:wordpressPostId/like — corpo vazio.
   */
  togglePostLike(wordpressPostId: number): Observable<PostLikePayload> {
    return this.http
      .post<ApiSuccessEnvelope<PostLikePayload>>(
        `${environment.apiUrl}/post/${wordpressPostId}/like`,
        {}
      )
      .pipe(this.unwrapData<PostLikePayload>());
  }

  /** GET /user/me */
  getMe(): Observable<UserMePayload> {
    return this.http
      .get<ApiSuccessEnvelope<UserMePayload>>(`${environment.apiUrl}/user/me`)
      .pipe(this.unwrapData<UserMePayload>());
  }

  /** PATCH /user/me — nome, apelido, sobre. */
  updateMe(body: UpdateMeRequest): Observable<BackendUser> {
    return this.http
      .patch<ApiSuccessEnvelope<BackendUser>>(`${environment.apiUrl}/user/me`, body)
      .pipe(this.unwrapData<BackendUser>());
  }

  /** GET /user/me/frequency */
  getFrequency(): Observable<FrequencyData> {
    return this.http
      .get<ApiSuccessEnvelope<FrequencyData>>(`${environment.apiUrl}/user/me/frequency`)
      .pipe(this.unwrapData<FrequencyData>());
  }

  /** GET /mission — progresso via Bearer quando existir. */
  getMissions(): Observable<MissionApiItem[]> {
    return this.http
      .get<ApiSuccessEnvelope<MissionApiItem[]>>(`${environment.apiUrl}/mission`)
      .pipe(this.unwrapData<MissionApiItem[]>());
  }

  /** GET /user/me/folders */
  getUserFolders(): Observable<UserFolder[]> {
    return this.http
      .get<ApiSuccessEnvelope<UserFolder[]>>(`${environment.apiUrl}/user/me/folders`)
      .pipe(this.unwrapData<UserFolder[]>());
  }

  /**
   * UUID da pasta sistema "Salvos" (`internalKey === 'default_saved'`).
   */
  getDefaultSavedFolderId(): Observable<string | null> {
    return this.getUserFolders().pipe(
      map((folders) => folders.find((f) => f.internalKey === 'default_saved')?.id ?? null)
    );
  }

  /** GET /user/me/folders/:folderId/posts */
  getFolderPosts(folderId: string): Observable<FolderPostsData> {
    return this.http
      .get<ApiSuccessEnvelope<FolderPostsData>>(
        `${environment.apiUrl}/user/me/folders/${folderId}/posts`
      )
      .pipe(this.unwrapData<FolderPostsData>());
  }

  /** POST /user/me/folders/:folderId/posts/:wordpressPostId */
  addPostToFolder(folderId: string, wordpressPostId: number): Observable<FolderPostMutationPayload> {
    return this.http
      .post<ApiSuccessEnvelope<FolderPostMutationPayload>>(
        `${environment.apiUrl}/user/me/folders/${folderId}/posts/${wordpressPostId}`,
        {}
      )
      .pipe(this.unwrapData<FolderPostMutationPayload>());
  }

  /** DELETE /user/me/folders/:folderId/posts/:wordpressPostId */
  removePostFromFolder(folderId: string, wordpressPostId: number): Observable<FolderPostMutationPayload> {
    return this.http
      .delete<ApiSuccessEnvelope<FolderPostMutationPayload>>(
        `${environment.apiUrl}/user/me/folders/${folderId}/posts/${wordpressPostId}`
      )
      .pipe(this.unwrapData<FolderPostMutationPayload>());
  }
}
