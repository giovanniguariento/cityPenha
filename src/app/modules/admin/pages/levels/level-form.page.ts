import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { of, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AdminLevel,
  AdminLevelCreate,
  AdminLevelPatch,
} from '../../../../shared/interface/admin.interface';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-level-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './level-form.page.html',
  styleUrl: './level-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminLevelFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly feedback = inject(FeedbackService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);

  readonly levelId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    { initialValue: null }
  );

  readonly isNew = computed(() => !this.levelId());
  readonly title = computed(() => (this.isNew() ? 'Novo level' : 'Editar level'));

  readonly form = this.fb.nonNullable.group({
    levelNumber: [1, [Validators.required, Validators.min(1)]],
    minXp: [0, [Validators.required, Validators.min(0)]],
    minCompletedMissions: [0, [Validators.required, Validators.min(0)]],
    title: ['', [Validators.maxLength(80)]],
    iconUrl: ['', [Validators.maxLength(500)]],
    rewardCoins: [0, [Validators.required, Validators.min(0)]],
    rewardXp: [0, [Validators.required, Validators.min(0)]],
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          if (!id) return of<AdminLevel | null>(null);
          return this.admin.getLevel(id).pipe(
            catchError((err) => {
              this.error.set(apiErrorMessage(err, 'Não foi possível carregar o level.'));
              return of<AdminLevel | null>(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((lvl) => {
        if (lvl) this.patchFromLevel(lvl);
        this.loading.set(false);
        this.cdr.markForCheck();
      });
  }

  private patchFromLevel(l: AdminLevel): void {
    this.form.patchValue({
      levelNumber: l.levelNumber,
      minXp: l.minXp,
      minCompletedMissions: l.minCompletedMissions,
      title: l.title ?? '',
      iconUrl: l.iconUrl ?? '',
      rewardCoins: l.rewardCoins ?? 0,
      rewardXp: l.rewardXp ?? 0,
    });
    this.form.markAsPristine();
  }

  private buildPayload(): AdminLevelCreate {
    const v = this.form.getRawValue();
    return {
      levelNumber: Number(v.levelNumber),
      minXp: Number(v.minXp),
      minCompletedMissions: Number(v.minCompletedMissions),
      title: v.title.trim() || null,
      iconUrl: v.iconUrl.trim() || null,
      rewardCoins: Number(v.rewardCoins),
      rewardXp: Number(v.rewardXp),
    };
  }

  onSubmit(): void {
    if (this.submitting() || this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const payload = this.buildPayload();
    this.submitting.set(true);
    const id = this.levelId();
    const obs$ = id
      ? this.admin.updateLevel(id, payload as AdminLevelPatch)
      : this.admin.createLevel(payload);
    obs$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.feedback.showSuccess(id ? 'Level atualizado' : 'Level criado');
          void this.router.navigate(['/admin/levels']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível salvar o level.'));
          this.cdr.markForCheck();
        },
      });
  }
}
