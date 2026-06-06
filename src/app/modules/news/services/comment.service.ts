import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  ApiSuccessEnvelope,
  CommentsListPayload,
  CommentView,
  CreateCommentPayload,
  CommentLikePayload,
} from '../../../shared/interface/home.interface';

@Injectable({ providedIn: 'root' })
export class CommentService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  listTopLevel(
    wordpressPostId: number,
    opts: { cursor?: string; limit?: number } = {}
  ): Observable<CommentsListPayload> {
    let params = new HttpParams();
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.limit) params = params.set('limit', String(opts.limit));
    return this.http.get<CommentsListPayload>(
      `${this.api}/post/${wordpressPostId}/comments`,
      { params }
    );
  }

  listReplies(
    commentId: string,
    opts: { cursor?: string; limit?: number } = {}
  ): Observable<CommentsListPayload> {
    let params = new HttpParams();
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.limit) params = params.set('limit', String(opts.limit));
    return this.http.get<CommentsListPayload>(
      `${this.api}/comment/${commentId}/replies`,
      { params }
    );
  }

  create(
    wordpressPostId: number,
    content: string,
    parentId?: string
  ): Observable<CreateCommentPayload> {
    const body: Record<string, unknown> = { content };
    if (parentId) body['parentId'] = parentId;
    return this.http
      .post<ApiSuccessEnvelope<CreateCommentPayload>>(
        `${this.api}/post/${wordpressPostId}/comments`,
        body
      )
      .pipe(map((r) => r.data));
  }

  toggleLike(commentId: string): Observable<CommentLikePayload> {
    return this.http
      .post<ApiSuccessEnvelope<CommentLikePayload>>(
        `${this.api}/comment/${commentId}/like`,
        {}
      )
      .pipe(map((r) => r.data));
  }

  delete(commentId: string): Observable<void> {
    return this.http
      .delete<ApiSuccessEnvelope<{ id: string }>>(`${this.api}/comment/${commentId}`)
      .pipe(map(() => undefined));
  }
}
