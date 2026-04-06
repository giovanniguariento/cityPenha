import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { apiErrorMessage } from '../../shared/utils/api-error-message';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog } from '@angular/material/dialog';
import { HomeService } from '../home/services/home.service';
import { LoginRequiredDialogComponent } from '../../shared/components/login-required-dialog/login-required-dialog.component';
import { AuthService } from '../../shared/services/auth.service';
import { take } from 'rxjs';

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

/** Returns the previous day in YYYY-MM-DD format. */
function previousDayKey(dateKey: string): string {
  const d = new Date(dateKey + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
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

  /** Weekdays (0=Sun..6=Sat) that appear in the consecutive streak only — drives day-cell checkmarks. */
  readonly streakWeekdays = computed(() => {
    const dateSet = this.consecutiveStreakDateSet();
    const weekdays = new Set<number>();
    for (const dateStr of dateSet) {
      const day = new Date(dateStr + 'T12:00:00').getDay();
      if (!Number.isNaN(day)) weekdays.add(day);
    }
    return weekdays;
  });

  /** Number of consecutive days (current streak). */
  readonly streakDays = computed(() => this.consecutiveStreakDateSet().size);

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
    return this.streakWeekdays().has(weekdayIndex);
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

  private buildCalendar(): void {
    const month = this.currentMonth();
    const year = month.getFullYear();
    const monthIndex = month.getMonth();

    const first = new Date(year, monthIndex, 1);
    const last = new Date(year, monthIndex + 1, 0);
    const startWeekday = first.getDay();
    const daysInMonth = last.getDate();

    const streakSet = new Set(this.streakDateStrings());
    const currentDateStr = this.currentStreakDateString();

    const days: DayStatus[] = [];

    const todayStr = currentDateStr; // today from API

    // Leading empty cells
    for (let i = 0; i < startWeekday; i++) {
      const prevMonth = new Date(year, monthIndex, -startWeekday + i + 1);
      const pk = this.dateKey(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate());
      days.push({
        cellKey: `cal-${pk}`,
        date: prevMonth.getDate(),
        isCurrentMonth: false,
        isActive: false,
        isTodayOrCurrent: false,
        isTodayNotRead: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = this.dateKey(year, monthIndex, d);
      const isInStreak = streakSet.has(dateStr);
      const isToday = dateStr === todayStr;
      const isTodayOrCurrent = isToday && isInStreak; // current (red) only when today and read
      const isTodayNotRead = isToday && !isInStreak;  // today but not read → gray
      days.push({
        cellKey: dateStr,
        date: d,
        isCurrentMonth: true,
        isActive: isInStreak,
        isTodayOrCurrent,
        isTodayNotRead,
      });
    }

    // Trailing empty cells to complete the grid (6 rows * 7)
    const total = days.length;
    const remainder = total % 7;
    const fill = remainder === 0 ? 0 : 7 - remainder;
    for (let i = 0; i < fill; i++) {
      const nextCell = new Date(year, monthIndex, daysInMonth + i + 1);
      const nk = this.dateKey(nextCell.getFullYear(), nextCell.getMonth(), nextCell.getDate());
      days.push({
        cellKey: `cal-${nk}`,
        date: nextCell.getDate(),
        isCurrentMonth: false,
        isActive: false,
        isTodayOrCurrent: false,
        isTodayNotRead: false,
      });
    }

    this.calendarDays.set(days);
  }

  share(): void {
    if (navigator.share) {
      navigator.share({
        title: 'Frequência - CityPenha',
        text: `Estou com ${this.streakDays()} dias seguidos! O conhecimento cresce com a frequência.`,
        url: window.location.href,
      }).catch(() => { });
    }
  }
}
