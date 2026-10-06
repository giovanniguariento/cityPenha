import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccessEnvelope } from '../../shared/interface/home.interface';

export type MyPostType = 'video' | 'article';

export interface MyPostListItem {
  id: number;
  slug: string;
  categorySlug: string;
  title: string;
  type: MyPostType;
  excerptPlain: string;
  thumbnailUrl: string;
  status: string;
  date: string;
  modified: string;
}

export interface MyPostListResult {
  items: MyPostListItem[];
  page: number;
  perPage: number;
  totalPages: number;
  total: number;
  hasMore: boolean;
}

export interface MyPostDetail {
  id: number;
  slug: string;
  type: MyPostType;
  title: string;
  categoryId: number | null;
  descriptionHtml?: string;
  contentHtml?: string;
  /** Custom article excerpt; empty when auto-generated from content. */
  summary?: string;
  thumbnailUrl: string;
  videoUrl?: string;
  status: string;
}

export interface MyPostUpdateResult {
  id: number;
  slug: string;
  categorySlug: string;
  onlyVideo: boolean;
}

@Injectable({ providedIn: 'root' })
export class MyPostsService {
  private readonly http = inject(HttpClient);

  list(page = 1, perPage = 20): Observable<MyPostListResult> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('perPage', String(perPage));
    return this.http
      .get<ApiSuccessEnvelope<MyPostListResult>>(`${environment.apiUrl}/post/mine`, {
        params,
      })
      .pipe(map((r) => r.data));
  }

  get(id: number): Observable<MyPostDetail> {
    return this.http
      .get<ApiSuccessEnvelope<MyPostDetail>>(`${environment.apiUrl}/post/mine/${id}`)
      .pipe(map((r) => r.data));
  }

  update(
    id: number,
    payload: {
      title?: string;
      descriptionHtml?: string;
      contentHtml?: string;
      summary?: string;
      categoryId?: number;
    }
  ): Observable<MyPostUpdateResult> {
    return this.http
      .patch<ApiSuccessEnvelope<MyPostUpdateResult>>(
        `${environment.apiUrl}/post/mine/${id}`,
        payload
      )
      .pipe(map((r) => r.data));
  }

  remove(id: number): Observable<{ id: number; deleted: boolean }> {
    return this.http
      .delete<ApiSuccessEnvelope<{ id: number; deleted: boolean }>>(
        `${environment.apiUrl}/post/mine/${id}`
      )
      .pipe(map((r) => r.data));
  }
}
