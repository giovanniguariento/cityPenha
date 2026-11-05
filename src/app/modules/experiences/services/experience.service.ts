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
import {
  CreateExperienceFields,
  ExperienceDetail,
  ExperienceLikePayload,
  ExperienceListItem,
  ExperienceMine,
  ExperienceSharePayload,
} from '../../../shared/interface/experience.interface';

@Injectable({ providedIn: 'root' })
export class ExperienceService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl.replace(/\/$/, '');

  getList(opts: { q?: string; featured?: boolean } = {}): Observable<ExperienceListItem[]> {
    let params = new HttpParams();
    if (opts.q?.trim()) params = params.set('q', opts.q.trim());
    if (opts.featured) params = params.set('featured', 'true');
    return this.http
      .get<ApiSuccessEnvelope<ExperienceListItem[]>>(`${this.api}/experiences`, { params })
      .pipe(map((r) => r.data));
  }

  getBySlug(slug: string): Observable<ExperienceDetail> {
    return this.http
      .get<ApiSuccessEnvelope<ExperienceDetail>>(`${this.api}/experiences/${encodeURIComponent(slug)}`)
      .pipe(map((r) => r.data));
  }

  listMine(): Observable<ExperienceMine[]> {
    return this.http
      .get<ApiSuccessEnvelope<ExperienceMine[]>>(`${this.api}/experiences/mine`)
      .pipe(map((r) => r.data));
  }

  getMine(id: string): Observable<ExperienceMine> {
    return this.http
      .get<ApiSuccessEnvelope<ExperienceMine>>(`${this.api}/experiences/mine/${id}`)
      .pipe(map((r) => r.data));
  }

  create(fields: CreateExperienceFields, coverFile?: File | null): Observable<ExperienceMine> {
    const form = this.toFormData(fields, coverFile);
    return this.http
      .post<ApiSuccessEnvelope<ExperienceMine>>(`${this.api}/experiences`, form)
      .pipe(map((r) => r.data));
  }

  update(
    id: string,
    fields: Partial<CreateExperienceFields>,
    coverFile?: File | null
  ): Observable<ExperienceMine> {
    const form = this.toFormData(fields, coverFile);
    return this.http
      .patch<ApiSuccessEnvelope<ExperienceMine>>(`${this.api}/experiences/${id}`, form)
      .pipe(map((r) => r.data));
  }

  delete(id: string): Observable<void> {
    return this.http
      .delete<ApiSuccessEnvelope<{ deleted: boolean }>>(`${this.api}/experiences/${id}`)
      .pipe(map(() => undefined));
  }

  toggleLike(id: string): Observable<ExperienceLikePayload> {
    return this.http
      .post<ApiSuccessEnvelope<ExperienceLikePayload>>(`${this.api}/experiences/${id}/like`, {})
      .pipe(map((r) => r.data));
  }

  registerShare(id: string): Observable<ExperienceSharePayload> {
    return this.http
      .post<ApiSuccessEnvelope<ExperienceSharePayload>>(`${this.api}/experiences/${id}/share`, {})
      .pipe(map((r) => r.data));
  }

  listComments(
    experienceId: string,
    opts: { cursor?: string; limit?: number } = {}
  ): Observable<CommentsListPayload> {
    let params = new HttpParams();
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.limit) params = params.set('limit', String(opts.limit));
    return this.http.get<CommentsListPayload>(
      `${this.api}/experiences/${experienceId}/comments`,
      { params }
    );
  }

  createComment(
    experienceId: string,
    content: string,
    parentId?: string
  ): Observable<CreateCommentPayload> {
    const body: Record<string, unknown> = { content };
    if (parentId) body['parentId'] = parentId;
    return this.http
      .post<ApiSuccessEnvelope<CreateCommentPayload>>(
        `${this.api}/experiences/${experienceId}/comments`,
        body
      )
      .pipe(map((r) => r.data));
  }

  listCommentReplies(
    commentId: string,
    opts: { cursor?: string; limit?: number } = {}
  ): Observable<CommentsListPayload> {
    let params = new HttpParams();
    if (opts.cursor) params = params.set('cursor', opts.cursor);
    if (opts.limit) params = params.set('limit', String(opts.limit));
    return this.http.get<CommentsListPayload>(
      `${this.api}/experience-comments/${commentId}/replies`,
      { params }
    );
  }

  toggleCommentLike(commentId: string): Observable<CommentLikePayload> {
    return this.http
      .post<ApiSuccessEnvelope<CommentLikePayload>>(
        `${this.api}/experience-comments/${commentId}/like`,
        {}
      )
      .pipe(map((r) => r.data));
  }

  deleteComment(commentId: string): Observable<void> {
    return this.http
      .delete<ApiSuccessEnvelope<{ deleted: boolean }>>(
        `${this.api}/experience-comments/${commentId}`
      )
      .pipe(map(() => undefined));
  }

  private toFormData(
    fields: Partial<CreateExperienceFields>,
    coverFile?: File | null
  ): FormData {
    const form = new FormData();
    const entries: [string, unknown][] = [
      ['title', fields.title],
      ['description', fields.description],
      ['venue', fields.venue],
      ['address', fields.address],
      ['startsAt', fields.startsAt],
      ['endsAt', fields.endsAt],
      ['conditionLabel', fields.conditionLabel],
      ['xpReward', fields.xpReward],
      ['featured', fields.featured],
      ['isAd', fields.isAd],
      ['status', fields.status],
      ['coverUrl', fields.coverUrl],
    ];
    for (const [key, value] of entries) {
      if (value === undefined || value === null) continue;
      form.append(key, String(value));
    }
    if (fields.tags) {
      form.append('tags', JSON.stringify(fields.tags));
    }
    if (coverFile) {
      form.append('cover', coverFile, coverFile.name);
    }
    return form;
  }
}
