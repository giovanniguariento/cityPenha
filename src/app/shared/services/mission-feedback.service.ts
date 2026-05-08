import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from './auth.service';
import { HomeService } from '../../modules/home/services/home.service';
import { MissionApiItem } from '../interface/home.interface';
import {
  MissionCompletedToastComponent,
  MissionCompletedToastData,
} from '../components/mission-completed-toast/mission-completed-toast.component';
import { catchError, distinctUntilChanged, EMPTY, switchMap } from 'rxjs';

const SNACK_PANEL = 'mission-completed-snackbar';

/** Janela para considerar completedAt como conclusão "agora" quando não há baseline no snapshot (ms). */
const RECENT_COMPLETION_MS = 120_000;

@Injectable({
  providedIn: 'root',
})
export class MissionFeedbackService {
  private readonly snackBar = inject(MatSnackBar);

  private readonly snapshot = new Map<string, { completed: boolean }>();

  private toastQueue: MissionCompletedToastData[] = [];
  private toastChainRunning = false;

  constructor() {
    const auth = inject(AuthService);
    const home = inject(HomeService);
    auth.user$
      .pipe(
        distinctUntilChanged((a, b) => a?.uid === b?.uid),
        switchMap((u) => {
          if (!u) {
            this.reset();
            return EMPTY;
          }
          return home.getMissions().pipe(catchError(() => EMPTY));
        })
      )
      .subscribe((missions) => {
        this.seed(missions);
      });
  }

  /**
   * Substitui o snapshot sem toast (GET /mission, GET /user/me).
   */
  seed(missions: MissionApiItem[] | undefined | null): void {
    if (!missions?.length) {
      this.snapshot.clear();
      return;
    }
    this.snapshot.clear();
    for (const m of missions) {
      this.snapshot.set(m.id, { completed: Boolean(m.completed) });
    }
  }

  reset(): void {
    this.snapshot.clear();
    this.toastQueue = [];
    this.toastChainRunning = false;
  }

  /**
   * Atualiza estado e mostra toasts para novas conclusões.
   * @returns true se pelo menos uma missão passou a concluída nesta atualização.
   */
  handleMissionsUpdate(missions: MissionApiItem[] | undefined | null): boolean {
    if (!missions?.length) {
      return false;
    }

    const prev = new Map(this.snapshot);
    let anyNew = false;

    for (const m of missions) {
      if (this.isNewlyCompleted(m, prev)) {
        this.enqueueToast(m);
        anyNew = true;
      }
    }

    this.applySnapshot(missions);
    return anyNew;
  }

  private isNewlyCompleted(m: MissionApiItem, prev: Map<string, { completed: boolean }>): boolean {
    if (!m.completed) {
      return false;
    }
    if (prev.has(m.id)) {
      return !prev.get(m.id)!.completed;
    }
    if (prev.size === 0) {
      return this.isRecentCompletion(m);
    }
    return this.isRecentCompletion(m);
  }

  private isRecentCompletion(m: MissionApiItem): boolean {
    if (!m.completedAt) {
      return false;
    }
    const at = Date.parse(m.completedAt);
    if (Number.isNaN(at)) {
      return false;
    }
    return Date.now() - at <= RECENT_COMPLETION_MS;
  }

  private applySnapshot(missions: MissionApiItem[]): void {
    for (const m of missions) {
      this.snapshot.set(m.id, { completed: Boolean(m.completed) });
    }
  }

  private enqueueToast(m: MissionApiItem): void {
    const data: MissionCompletedToastData = {
      title: m.title,
      coinReward: m.coinReward ?? 0,
      xpReward: m.xpReward ?? 0,
    };
    this.toastQueue.push(data);
    this.runToastChain();
  }

  private runToastChain(): void {
    if (this.toastChainRunning || this.toastQueue.length === 0) {
      return;
    }
    this.toastChainRunning = true;
    const next = (): void => {
      const data = this.toastQueue.shift();
      if (!data) {
        this.toastChainRunning = false;
        return;
      }
      const ref = this.snackBar.openFromComponent(MissionCompletedToastComponent, {
        data,
        duration: 5200,
        horizontalPosition: 'right',
        verticalPosition: 'bottom',
        panelClass: [SNACK_PANEL],
      });
      ref.afterDismissed().subscribe(() => next());
    };
    next();
  }
}
