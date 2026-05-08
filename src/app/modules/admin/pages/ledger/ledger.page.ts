import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LedgerEntry,
  parseRewardSource,
  rewardSourceLabel,
} from '../../../../shared/interface/admin.interface';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { AdminService } from '../../services/admin.service';

type KindFilter = 'all' | 'MISSION' | 'BADGE' | 'LEVEL_UP' | 'READ_XP';

const PAGE_SIZE = 50;

@Component({
  selector: 'app-admin-ledger',
  standalone: true,
  imports: [],
  templateUrl: './ledger.page.html',
  styleUrl: './ledger.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLedgerPage {
  private readonly admin = inject(AdminService);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userId = signal('');
  readonly searchedUserId = signal<string | null>(null);
  readonly entries = signal<LedgerEntry[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly kindFilter = signal<KindFilter>('all');

  readonly filtered = computed(() => {
    const list = this.entries();
    const filter = this.kindFilter();
    if (filter === 'all') return list;
    return list.filter((e) => e.source.startsWith(`${filter}:`));
  });

  setUserId(value: string): void {
    this.userId.set(value);
  }

  setKindFilter(value: KindFilter): void {
    this.kindFilter.set(value);
  }

  search(): void {
    const uid = this.userId().trim();
    if (!uid) {
      this.feedback.showError('Informe o userId.');
      return;
    }
    this.searchedUserId.set(uid);
    this.entries.set([]);
    this.nextCursor.set(null);
    this.error.set(null);
    this.loading.set(true);
    this.admin
      .getLedger(uid, { limit: PAGE_SIZE })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.entries.set(res.data);
          this.nextCursor.set(res.meta?.nextCursor ?? null);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar o ledger.'));
        },
      });
  }

  loadMore(): void {
    const uid = this.searchedUserId();
    const cursor = this.nextCursor();
    if (!uid || !cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.admin
      .getLedger(uid, { limit: PAGE_SIZE, cursor })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.entries.update((prev) => [...prev, ...res.data]);
          this.nextCursor.set(res.meta?.nextCursor ?? null);
          this.loadingMore.set(false);
        },
        error: (err) => {
          this.loadingMore.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível carregar mais.'));
        },
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

  sourceLabel(source: string): string {
    return rewardSourceLabel(source);
  }

  sourceKindFor(source: string): string {
    return parseRewardSource(source).kind;
  }
}
