import { isPlatformBrowser } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, PLATFORM_ID, signal } from '@angular/core';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { HomeService } from '../home/services/home.service';
import { LoginRequiredDialogComponent } from '../../shared/components/login-required-dialog/login-required-dialog.component';
import { AuthService } from '../../shared/services/auth.service';
import { take } from 'rxjs';
import { SeoService } from '../../shared/services/seo.service';
import { FeedbackService } from '../../shared/services/feedback.service';

const WEEKDAY_LETTERS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export interface DayStatus {
  /** Stable key for @for track (calendar cell identity). */
  cellKey: string;
  date: number;
  isCurrentMonth: boolean;
  isActive: boolean;
  isTodayOrCurrent: boolean;
  /** True when it's today but today is not in daysWithReads (gray background). */
  isTodayNotRead: boolean;
}

/** Local calendar YYYY-MM-DD (avoid UTC `toISOString` day shifts). */
function toYmdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Returns the previous day in YYYY-MM-DD format. */
function previousDayKey(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return toYmdLocal(d);
}

/** Sunday (start) of the week containing `dateKey` (UI week: Sun–Sat). */
function sundayOfWeekContaining(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return toYmdLocal(d);
}

/** Saturday (end) of the week containing `dateKey`. */
function saturdayOfWeekContaining(dateKey: string): string {
  const d = new Date(sundayOfWeekContaining(dateKey) + 'T12:00:00');
  d.setDate(d.getDate() + 6);
  return toYmdLocal(d);
}

@Component({
  selector: 'app-frequencia',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './frequencia.page.html',
  styleUrl: './frequencia.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FrequenciaPage implements OnInit {
  private readonly homeService = inject(HomeService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly seoService = inject(SeoService);
  private readonly feedback = inject(FeedbackService);

  readonly weekDayLetters = WEEKDAY_LETTERS;
  readonly weekDayLabels = WEEKDAY_LABELS;

  /** Displayed month/year for calendar */
  readonly currentMonth = signal(new Date());

  /** Full dates (YYYY-MM-DD) that are part of the streak (light red). Only these months will show highlight. */
  readonly streakDateStrings = signal<string[]>([]);
  /** Full date (YYYY-MM-DD) of the most recent active day (solid red). */
  readonly currentStreakDateString = signal<string>('');

  /** Last date (YYYY-MM-DD) of the streak — most recent in daysWithReads. Streak count ends here. */
  private readonly lastStreakDate = computed(() => {
    const dates = this.streakDateStrings();
    if (dates.length === 0) return '';
    return [...dates].sort()[dates.length - 1];
  });

  /** Set of dates (YYYY-MM-DD) that form the current consecutive streak (last day + previous consecutive). */
  private readonly consecutiveStreakDateSet = computed(() => {
    const cursor = this.lastStreakDate();
    if (!cursor) return new Set<string>();
    const streakDates = this.streakDateStrings();
    const allSet = new Set(streakDates);
    const result = new Set<string>();
    let c = cursor;
    for (; ;) {
      result.add(c);
      const prev = previousDayKey(c);
      if (!allSet.has(prev)) break;
      c = prev;
    }
    return result;
  });

  /** True when the most recent read falls in the week of `today` (summary card + week row only). */
  private readonly lastReadInCurrentWeek = computed(() => {
    const todayStr = this.currentStreakDateString();
    const last = this.lastStreakDate();
    if (!todayStr || !last) return false;
    const weekStart = sundayOfWeekContaining(todayStr);
    const weekEnd = saturdayOfWeekContaining(todayStr);
    return last >= weekStart && last <= weekEnd;
  });

  /**
   * True when the most recent read is today or yesterday (no calendar gap without a read before today).
   * If the last read was earlier, the streak is broken even if the tail block has length 1.
   */
  private readonly lastReadContiguousWithToday = computed(() => {
    const todayStr = this.currentStreakDateString();
    const last = this.lastStreakDate();
    if (!todayStr || !last) return false;
    if (last === todayStr) return true;
    return last === previousDayKey(todayStr);
  });

  /** Seven YYYY-MM-DD keys (Sun→Sat) for the week containing `today`. */
  private readonly currentWeekDateKeys = computed(() => {
    const todayStr = this.currentStreakDateString();
    if (!todayStr) return [] as string[];
    const sun = new Date(sundayOfWeekContaining(todayStr) + 'T12:00:00');
    const keys: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      keys.push(toYmdLocal(d));
    }
    return keys;
  });

  /** Consecutive streak length for the summary; 0 if last read is not this week or not today/yesterday. */
  readonly streakDays = computed(() =>
    this.lastReadInCurrentWeek() && this.lastReadContiguousWithToday()
      ? this.consecutiveStreakDateSet().size
      : 0
  );

  /** Streak number with leading zero when < 10 (e.g. 05, 09). */
  readonly streakDaysFormatted = computed(() => {
    const n = this.streakDays();
    return n < 10 ? '0' + n : String(n);
  });

  calendarDays = signal<DayStatus[]>([]);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  constructor() {
    this.buildCalendar();
  }

  ngOnInit(): void {
    this.seoService.setPage({
      title: 'Frequência de Leitura',
      description: 'Acompanhe sua sequência de leitura diária e construa o hábito de se informar com o CityPenha.',
      url: 'https://citypenha.com.br/frequencia',
      type: 'website',
    });

    // Não usar auth.currentUser aqui: no carregamento direto da rota o Firebase ainda pode
    // não ter restaurado a sessão. user$ emite após o estado inicial estar definido.
    this.authService.user$
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe((firebaseUser) => {
        if (!firebaseUser) {
          this.loading.set(false);
          this.dialog.open(LoginRequiredDialogComponent, {
            data: { points: 10, actionLabel: 'acessar a frequência', noRedirect: true, isFrequencyContext: true }
          }).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
          return;
        }

        this.homeService
          .getFrequency()
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (data) => {
              this.streakDateStrings.set(data.daysWithReads ?? []);
              this.currentStreakDateString.set(data.today ?? '');
              this.buildCalendar();
              this.loading.set(false);
              this.error.set(null);
            },
            error: (err: unknown) => {
              this.loading.set(false);
              this.error.set(apiErrorMessage(err, 'Não foi possível carregar a frequência.'));
            },
          });
      });
  }

  /** Weekday index (0–6) when today is set but not in daysWithReads; otherwise -1. */
  readonly todayNotReadWeekday = computed(() => {
    const todayStr = this.currentStreakDateString();
    if (!todayStr) return -1;
    if (this.streakDateStrings().includes(todayStr)) return -1;
    const day = new Date(todayStr + 'T12:00:00').getDay();
    return Number.isNaN(day) ? -1 : day;
  });

  isChecked(weekdayIndex: number): boolean {
    if (!this.lastReadInCurrentWeek() || !this.lastReadContiguousWithToday()) return false;
    const keys = this.currentWeekDateKeys();
    const dateStr = keys[weekdayIndex];
    if (!dateStr) return false;
    return this.consecutiveStreakDateSet().has(dateStr);
  }

  /** True when this weekday is today and today is not in daysWithReads (show gray circle). */
  isTodayNotReadCell(weekdayIndex: number): boolean {
    return this.todayNotReadWeekday() === weekdayIndex;
  }

  prevMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() - 1);
    this.currentMonth.set(d);
    this.buildCalendar();
  }

  nextMonth(): void {
    const d = new Date(this.currentMonth());
    d.setMonth(d.getMonth() + 1);
    this.currentMonth.set(d);
    this.buildCalendar();
  }

  monthYearLabel(): string {
    const str = this.currentMonth().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const capitalized = str.charAt(0).toUpperCase() + str.slice(1);
    return capitalized.replace(/\s+de\s+/i, ' ');
  }

  private dateKey(year: number, month: number, day: number): string {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private dayStatusForDateKey(
    dateKey: string,
    dateDisplay: number,
    isCurrentMonth: boolean,
    cellKey: string,
    streakSet: Set<string>,
    todayStr: string
  ): DayStatus {
    const isInStreak = streakSet.has(dateKey);
    const isToday = dateKey === todayStr;
    return {
      cellKey,
      date: dateDisplay,
      isCurrentMonth,
      isActive: isInStreak,
      isTodayOrCurrent: isToday && isInStreak,
      isTodayNotRead: isToday && !isInStreak,
    };
  }

  private buildCalendar(): void {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);
    const startWeekday = first.getDay();
    const daysInMonth = last.getDate();

    const streakSet = new Set(this.streakDateStrings());
    const todayStr = this.currentStreakDateString();

    const days: DayStatus[] = [];

    // Leading cells (previous month) — same read/today rules as current month
    for (let i = 0; i < startWeekday; i++) {
      const prevMonth = new Date(year, monthIndex, -startWeekday + i + 1);
      const pk = this.dateKey(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate());
      days.push(
        this.dayStatusForDateKey(pk, prevMonth.getDate(), false, `cal-${pk}`, streakSet, todayStr)
      );
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = this.dateKey(year, monthIndex, d);
      days.push(
        this.dayStatusForDateKey(dateStr, d, true, dateStr, streakSet, todayStr)
      );
    }

    // Trailing cells (next month)
    const total = days.length;
    const remainder = total % 7;
    const fill = remainder === 0 ? 0 : 7 - remainder;
    for (let i = 0; i < fill; i++) {
      const nextCell = new Date(year, monthIndex, daysInMonth + i + 1);
      const nk = this.dateKey(nextCell.getFullYear(), nextCell.getMonth(), nextCell.getDate());
      days.push(
        this.dayStatusForDateKey(nk, nextCell.getDate(), false, `cal-${nk}`, streakSet, todayStr)
      );
    }

    this.calendarDays.set(days);
  }

  async share(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const url = window.location.href;
    const shareData: ShareData = {
      title: 'Frequência - CityPenha',
      text: `Estou com ${this.streakDays()} dias seguidos! O conhecimento cresce com a frequência.`,
      url,
    };

    if (navigator.share && (navigator.canShare == null || navigator.canShare(shareData))) {
      try {
        await navigator.share(shareData);
      } catch (e) {
        if (e instanceof Error && e.name !== 'AbortError') {
          await this.fallbackCopyToClipboard(url);
        }
      }
    } else {
      await this.fallbackCopyToClipboard(url);
    }
  }

  private async fallbackCopyToClipboard(url: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(url);
      this.feedback.showSuccess('Link copiado!', 2500);
    } catch {
      const el = document.createElement('input');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      this.feedback.showSuccess('Link copiado!', 2500);
    }
  }
}
