import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { AdminWordpressAccessItem } from '../../../../shared/interface/admin.interface';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { AdminService } from '../../services/admin.service';

const PAGE_SIZE = 50;
const SEARCH_DEBOUNCE_MS = 400;

@Component({
  selector: 'app-admin-wordpress-access',
  standalone: true,
  imports: [],
  templateUrl: './wordpress-access.page.html',
  styleUrl: './wordpress-access.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminWordpressAccessPage {
  private readonly admin = inject(AdminService);
  private readonly feedback = inject(FeedbackService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly search$ = new Subject<string>();

  readonly items = signal<AdminWordpressAccessItem[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly searchInput = signal('');
  readonly q = signal('');
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly provisioningUserId = signal<string | null>(null);
  readonly revealedPasswordIds = signal<Set<string>>(new Set());

  constructor() {
    this.search$
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((term) => {
        this.q.set(term);
        this.load({ reset: true });
      });

    this.load({ reset: true });
  }

  setQuery(value: string): void {
    this.searchInput.set(value);
    this.search$.next(value);
  }

  load(opts: { reset?: boolean } = {}): void {
    if (opts.reset) {
      this.loading.set(true);
      this.error.set(null);
      this.items.set([]);
      this.nextCursor.set(null);
    }

    this.admin
      .listWordpressAccess({
        limit: PAGE_SIZE,
        q: this.q() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.set(res.data);
          this.nextCursor.set(res.meta?.nextCursor ?? null);
          this.loading.set(false);
        },
        error: (err) => this.handleLoadError(err, opts.reset !== false),
      });
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    if (!cursor || this.loadingMore()) return;

    this.loadingMore.set(true);
    this.admin
      .listWordpressAccess({
        limit: PAGE_SIZE,
        cursor,
        q: this.q() || undefined,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items.update((prev) => [...prev, ...res.data]);
          this.nextCursor.set(res.meta?.nextCursor ?? null);
          this.loadingMore.set(false);
        },
        error: (err) => {
          this.loadingMore.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível carregar mais.'));
        },
      });
  }

  retry(): void {
    this.load({ reset: true });
  }

  isPasswordRevealed(userId: string): boolean {
    return this.revealedPasswordIds().has(userId);
  }

  togglePasswordReveal(userId: string): void {
    this.revealedPasswordIds.update((set) => {
      const next = new Set(set);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  displayPassword(item: AdminWordpressAccessItem): string {
    if (!item.wordpressPassword) return '—';
    return this.isPasswordRevealed(item.userId) ? item.wordpressPassword : '••••••••';
  }

  async copyText(text: string | null | undefined): Promise<void> {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.feedback.showSuccess('Copiado');
    } catch {
      this.feedback.showError('Não foi possível copiar.');
    }
  }

  copyAll(item: AdminWordpressAccessItem): void {
    const lines = [
      item.wordpressLoginUrl ? `URL: ${item.wordpressLoginUrl}` : null,
      item.wordpressUsername ? `Usuário: ${item.wordpressUsername}` : null,
      item.wordpressPassword ? `Senha: ${item.wordpressPassword}` : null,
    ].filter(Boolean);
    void this.copyText(lines.join('\n'));
  }

  openLoginUrl(url: string): void {
    if (!url?.trim()) return;
    window.open(url, '_blank', 'noopener');
  }

  canProvision(item: AdminWordpressAccessItem): boolean {
    return item.credentialsStatus === 'missing' && item.wordpressId != null;
  }

  provision(item: AdminWordpressAccessItem): void {
    if (this.provisioningUserId() || !this.canProvision(item)) return;

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          message:
            'Isso vai gerar uma nova senha no WordPress. Se o usuário já tiver uma senha antiga, ela deixará de funcionar. Continuar?',
          confirmLabel: 'Provisionar',
          cancelLabel: 'Cancelar',
        },
      }
    );

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.runProvision(item.userId);
      });
  }

  canResetPassword(item: AdminWordpressAccessItem): boolean {
    return item.wordpressId != null && item.credentialsStatus === 'ready';
  }

  resetPassword(item: AdminWordpressAccessItem): void {
    if (this.provisioningUserId() || !this.canResetPassword(item)) return;

    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          message:
            'Isso vai gerar uma NOVA senha no WordPress e substituir a atual. Use quando a senha exibida não estiver funcionando no login WordPress. Continuar?',
          confirmLabel: 'Redefinir senha',
          cancelLabel: 'Cancelar',
        },
      }
    );

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.runProvision(item.userId, true);
      });
  }

  formatDate(iso: string): string {
    try {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  }

  statusLabel(item: AdminWordpressAccessItem): string {
    if (item.wordpressId == null) return 'Sem conta WP';
    if (item.credentialsStatus === 'ready') return 'Pronto';
    return 'Pendente';
  }

  private runProvision(userId: string, force = false): void {
    this.provisioningUserId.set(userId);
    this.admin
      .provisionWordpressAccess(userId, force)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.items.update((list) => list.map((it) => (it.userId === userId ? updated : it)));
          this.provisioningUserId.set(null);
          this.feedback.showSuccess(
            'Credenciais geradas. A senha anterior no WordPress foi substituída.'
          );
        },
        error: (err) => {
          this.provisioningUserId.set(null);
          this.feedback.showError(
            apiErrorMessage(err, 'Não foi possível provisionar as credenciais.')
          );
        },
      });
  }

  private handleLoadError(err: unknown, isInitialLoad: boolean): void {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 403) {
        this.error.set('Sem permissão para acessar esta área.');
        this.loading.set(false);
        return;
      }
      if (err.status === 401) {
        this.error.set('Sessão expirada. Faça login novamente.');
        this.loading.set(false);
        return;
      }
    }

    const message = apiErrorMessage(err, 'Não foi possível carregar os acessos WordPress.');
    if (isInitialLoad) {
      this.error.set(message);
      this.loading.set(false);
    } else {
      this.feedback.showError(message);
    }
  }
}
