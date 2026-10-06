import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiSuccessEnvelope } from '../../shared/interface/home.interface';

export type CreatePostType = 'video' | 'article';

export interface CreatePostResult {
  id: number;
  slug: string;
  categorySlug: string;
  onlyVideo: boolean;
}

@Injectable({ providedIn: 'root' })
export class CreatePostService {
  private readonly http = inject(HttpClient);

  create(input: {
    type?: CreatePostType;
    video?: File;
    /** TipTap caption (video) or body (article). */
    descriptionHtml?: string;
    contentHtml?: string;
    /** Plain-text fallback if multipart drops HTML. */
    descriptionText?: string;
    /** Optional custom article excerpt (plain text, max 280). */
    summary?: string;
    categoryId: number;
    title?: string;
    /** JPEG/PNG/WebP poster / featured image. */
    thumbnail?: Blob | File;
  }): Observable<CreatePostResult> {
    const type: CreatePostType = input.type ?? 'video';
    const form = new FormData();

    if (type === 'video') {
      if (!input.video) {
        throw new Error('video is required for type=video');
      }
      form.append('video', input.video);
    }

    const meta = {
      type,
      descriptionHtml: input.descriptionHtml,
      contentHtml: input.contentHtml,
      descriptionText: input.descriptionText?.trim() || undefined,
      summary: input.summary?.trim() || undefined,
      categoryId: input.categoryId,
      title: input.title?.trim() || undefined,
    };
    form.append(
      'meta',
      new Blob([JSON.stringify(meta)], { type: 'application/json' }),
      'meta.json'
    );

    form.append('type', type);
    if (input.descriptionHtml) {
      form.append('descriptionHtml', input.descriptionHtml);
    }
    if (input.contentHtml) {
      form.append('contentHtml', input.contentHtml);
    }
    if (input.descriptionText?.trim()) {
      form.append('descriptionText', input.descriptionText.trim());
    }
    if (input.summary?.trim()) {
      form.append('summary', input.summary.trim());
    }
    form.append('categoryId', String(input.categoryId));
    if (input.title?.trim()) {
      form.append('title', input.title.trim());
    }

    if (input.thumbnail) {
      const thumbFile =
        input.thumbnail instanceof File
          ? input.thumbnail
          : new File([input.thumbnail], 'poster.jpg', {
              type: input.thumbnail.type || 'image/jpeg',
            });
      form.append('thumbnail', thumbFile);
    }
    return this.http
      .post<ApiSuccessEnvelope<CreatePostResult>>(
        `${environment.apiUrl}/post/create`,
        form
      )
      .pipe(map((r) => r.data));
  }
}
