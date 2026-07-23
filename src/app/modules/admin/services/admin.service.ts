import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, OperatorFunction, shareReplay, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiSuccessEnvelope, UserMePayload } from '../../../shared/interface/home.interface';
import {
  AdminBadge,
  AdminBadgeCreate,
  AdminBadgePatch,
  AdminLevel,
  AdminLevelCreate,
  AdminLevelPatch,
  AdminMission,
  AdminMissionCreate,
  AdminMissionPatch,
  LedgerEntry,
  LedgerListQuery,
  LedgerListResponse,
  MetricInfo,
  PreviewResponse,
  AdminWordpressAccessItem,
  WordpressAccessListQuery,
  WordpressAccessListResponse,
} from '../../../shared/interface/admin.interface';

/** Centraliza todas as chamadas ao prefixo `/admin/*`. Bearer é injetado pelo `authApiInterceptor`. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/admin`;

  private metricsCache$: Observable<MetricInfo[]> | null = null;

  private unwrap<T>(): OperatorFunction<ApiSuccessEnvelope<T>, T> {
    return map((r) => r.data);
  }

  /**
   * Probe de acesso: 200 → admin; 401/403 → não-admin. Outros erros propagam para que o guard
   * possa decidir entre redirecionar ou exibir mensagem (rede instável, 5xx).
   */
  probeAccess(): Observable<boolean> {
    return this.http.get<ApiSuccessEnvelope<MetricInfo[]>>(`${this.base}/metrics`).pipe(
      map(() => true),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
          return of(false);
        }
        return throwError(() => err);
      })
    );
  }

  /** GET /admin/metrics — usado pelo guard e pelos formulários. Cache compartilhado entre páginas. */
  getMetrics(): Observable<MetricInfo[]> {
    if (!this.metricsCache$) {
      this.metricsCache$ = this.http
        .get<ApiSuccessEnvelope<MetricInfo[]>>(`${this.base}/metrics`)
        .pipe(
          this.unwrap<MetricInfo[]>(),
          shareReplay(1),
          catchError((err) => {
            this.metricsCache$ = null;
            return throwError(() => err);
          })
        );
    }
    return this.metricsCache$;
  }

  // ── Missions ─────────────────────────────────────────────────────────────────

  listMissions(): Observable<AdminMission[]> {
    return this.http
      .get<ApiSuccessEnvelope<AdminMission[]>>(`${this.base}/missions`)
      .pipe(this.unwrap<AdminMission[]>());
  }

  getMission(id: string): Observable<AdminMission> {
    return this.http
      .get<ApiSuccessEnvelope<AdminMission>>(`${this.base}/missions/${id}`)
      .pipe(this.unwrap<AdminMission>());
  }

  createMission(body: AdminMissionCreate): Observable<AdminMission> {
    return this.http
      .post<ApiSuccessEnvelope<AdminMission>>(`${this.base}/missions`, body)
      .pipe(this.unwrap<AdminMission>());
  }

  updateMission(id: string, patch: AdminMissionPatch): Observable<AdminMission> {
    return this.http
      .patch<ApiSuccessEnvelope<AdminMission>>(`${this.base}/missions/${id}`, patch)
      .pipe(this.unwrap<AdminMission>());
  }

  deleteMission(id: string): Observable<{ id: string }> {
    return this.http
      .delete<ApiSuccessEnvelope<{ id: string }>>(`${this.base}/missions/${id}`)
      .pipe(this.unwrap<{ id: string }>());
  }

  previewMission(id: string, userId: string): Observable<PreviewResponse> {
    return this.http
      .post<ApiSuccessEnvelope<PreviewResponse>>(`${this.base}/missions/${id}/preview`, { userId })
      .pipe(this.unwrap<PreviewResponse>());
  }

  // ── Badges ───────────────────────────────────────────────────────────────────

  listBadges(): Observable<AdminBadge[]> {
    return this.http
      .get<ApiSuccessEnvelope<AdminBadge[]>>(`${this.base}/badges`)
      .pipe(this.unwrap<AdminBadge[]>());
  }

  getBadge(id: string): Observable<AdminBadge> {
    return this.http
      .get<ApiSuccessEnvelope<AdminBadge>>(`${this.base}/badges/${id}`)
      .pipe(this.unwrap<AdminBadge>());
  }

  createBadge(body: AdminBadgeCreate): Observable<AdminBadge> {
    return this.http
      .post<ApiSuccessEnvelope<AdminBadge>>(`${this.base}/badges`, body)
      .pipe(this.unwrap<AdminBadge>());
  }

  updateBadge(id: string, patch: AdminBadgePatch): Observable<AdminBadge> {
    return this.http
      .patch<ApiSuccessEnvelope<AdminBadge>>(`${this.base}/badges/${id}`, patch)
      .pipe(this.unwrap<AdminBadge>());
  }

  deleteBadge(id: string): Observable<{ id: string }> {
    return this.http
      .delete<ApiSuccessEnvelope<{ id: string }>>(`${this.base}/badges/${id}`)
      .pipe(this.unwrap<{ id: string }>());
  }

  // ── Levels ───────────────────────────────────────────────────────────────────

  listLevels(): Observable<AdminLevel[]> {
    return this.http
      .get<ApiSuccessEnvelope<AdminLevel[]>>(`${this.base}/levels`)
      .pipe(this.unwrap<AdminLevel[]>());
  }

  getLevel(id: string): Observable<AdminLevel> {
    return this.http
      .get<ApiSuccessEnvelope<AdminLevel>>(`${this.base}/levels/${id}`)
      .pipe(this.unwrap<AdminLevel>());
  }

  createLevel(body: AdminLevelCreate): Observable<AdminLevel> {
    return this.http
      .post<ApiSuccessEnvelope<AdminLevel>>(`${this.base}/levels`, body)
      .pipe(this.unwrap<AdminLevel>());
  }

  updateLevel(id: string, patch: AdminLevelPatch): Observable<AdminLevel> {
    return this.http
      .patch<ApiSuccessEnvelope<AdminLevel>>(`${this.base}/levels/${id}`, patch)
      .pipe(this.unwrap<AdminLevel>());
  }

  deleteLevel(id: string): Observable<{ id: string }> {
    return this.http
      .delete<ApiSuccessEnvelope<{ id: string }>>(`${this.base}/levels/${id}`)
      .pipe(this.unwrap<{ id: string }>());
  }

  // ── Ledger / Recompute ───────────────────────────────────────────────────────

  /**
   * Resposta segue formato `{ data: LedgerEntry[], meta: { nextCursor, count } }`. Aqui não usamos
   * `unwrap` porque preservamos o `meta` inteiro para a paginação (FRONTEND_GAMIFICATION.md §10.6).
   */
  getLedger(userId: string, query: LedgerListQuery = {}): Observable<LedgerListResponse> {
    let params = new HttpParams();
    if (query.limit != null) params = params.set('limit', String(query.limit));
    if (query.cursor) params = params.set('cursor', query.cursor);
    return this.http.get<LedgerListResponse>(`${this.base}/users/${userId}/ledger`, { params });
  }

  recompute(userId: string): Observable<UserMePayload> {
    return this.http
      .post<ApiSuccessEnvelope<UserMePayload>>(`${this.base}/recompute/${userId}`, {})
      .pipe(this.unwrap<UserMePayload>());
  }

  // ── WordPress access ─────────────────────────────────────────────────────────

  /** GET /admin/users/wordpress-access — lista paginada por cursor. */
  listWordpressAccess(query: WordpressAccessListQuery = {}): Observable<WordpressAccessListResponse> {
    let params = new HttpParams();
    if (query.limit != null) params = params.set('limit', String(query.limit));
    if (query.cursor) params = params.set('cursor', query.cursor);
    if (query.q?.trim()) params = params.set('q', query.q.trim());
    return this.http.get<WordpressAccessListResponse>(`${this.base}/users/wordpress-access`, { params });
  }

  /** GET /admin/users/:userId/wordpress-access — detalhe de um usuário. */
  getWordpressAccess(userId: string): Observable<AdminWordpressAccessItem> {
    return this.http
      .get<ApiSuccessEnvelope<AdminWordpressAccessItem>>(
        `${this.base}/users/${userId}/wordpress-access`
      )
      .pipe(this.unwrap<AdminWordpressAccessItem>());
  }

  /**
   * POST /admin/users/:userId/wordpress-access/provision — gera credenciais.
   * `force=true` regenera a senha mesmo quando já existe uma (ressincroniza com o WordPress).
   */
  provisionWordpressAccess(
    userId: string,
    force = false
  ): Observable<AdminWordpressAccessItem> {
    return this.http
      .post<ApiSuccessEnvelope<AdminWordpressAccessItem>>(
        `${this.base}/users/${userId}/wordpress-access/provision`,
        { force }
      )
      .pipe(this.unwrap<AdminWordpressAccessItem>());
  }
}

/** Mantém o tipo exportado para conveniência em consumidores do service. */
export type { LedgerEntry };
