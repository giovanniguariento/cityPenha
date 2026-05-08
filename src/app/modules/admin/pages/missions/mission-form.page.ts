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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Overlay } from '@angular/cdk/overlay';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, of, switchMap } from 'rxjs';
import { catchError, map, startWith } from 'rxjs/operators';
import {
  AdminMission,
  AdminMissionCreate,
  AdminMissionPatch,
  CriteriaNode,
  MetricInfo,
} from '../../../../shared/interface/admin.interface';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import {
  CriteriaEditorComponent,
} from '../../components/criteria-editor/criteria-editor.component';
import {
  MetricParamsFieldsComponent,
} from '../../components/metric-params-fields/metric-params-fields.component';
import {
  MissionPreviewDialogComponent,
  MissionPreviewDialogData,
} from '../../components/mission-preview-dialog/mission-preview-dialog.component';
import { AdminService } from '../../services/admin.service';

const KEY_REGEX = /^[a-z0-9_]+$/;
const ADMIN_THEME_STORAGE_KEY = 'admin-theme-mode';

function keyValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '').toString().trim();
  if (!v) return null;
  return KEY_REGEX.test(v) ? null : { keyFormat: true };
}

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const startsAt = group.get('startsAt')?.value;
  const endsAt = group.get('endsAt')?.value;
  if (!startsAt || !endsAt) return null;
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  if (Number.isFinite(start) && Number.isFinite(end) && start >= end) {
    return { dateRange: true };
  }
  return null;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function fromDatetimeLocal(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

@Component({
  selector: 'app-admin-mission-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatDialogModule,
    CriteriaEditorComponent,
    MetricParamsFieldsComponent,
  ],
  templateUrl: './mission-form.page.html',
  styleUrl: './mission-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminMissionFormPage {
  private readonly fb = inject(FormBuilder);
  private readonly admin = inject(AdminService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly feedback = inject(FeedbackService);
  private readonly dialog = inject(MatDialog);
  private readonly overlay = inject(Overlay);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly error = signal<string | null>(null);
  readonly metrics = signal<MetricInfo[]>([]);
  readonly mission = signal<AdminMission | null>(null);

  readonly missionId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    { initialValue: null }
  );

  readonly isNew = computed(() => !this.missionId());
  readonly title = computed(() => (this.isNew() ? 'Nova missão' : 'Editar missão'));

  readonly form = this.fb.nonNullable.group(
    {
      key: ['', [Validators.required, Validators.maxLength(60), keyValidator]],
      title: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', [Validators.maxLength(500)]],
      iconUrl: ['', [Validators.maxLength(500)]],
      category: ['', [Validators.maxLength(80)]],
      isActive: [true],
      startsAt: [''],
      endsAt: [''],
      metricKey: ['', [Validators.required]],
      metricParams: this.fb.nonNullable.control<Record<string, unknown> | null>(null),
      target: [1, [Validators.required, Validators.min(1)]],
      coinReward: [0, [Validators.required, Validators.min(0)]],
      xpReward: [0, [Validators.required, Validators.min(0)]],
      isReversible: [false],
      criteria: this.fb.nonNullable.control<CriteriaNode | null>(null),
    },
    { validators: dateRangeValidator }
  );
  readonly selectedMetricKey = signal<string>(this.form.controls.metricKey.value);

  readonly selectedMetric = computed(
    () => this.metrics().find((m) => m.key === this.selectedMetricKey()) ?? null
  );

  constructor() {
    combineLatest([this.admin.getMetrics(), this.route.paramMap])
      .pipe(
        switchMap(([metrics, params]) => {
          this.metrics.set(metrics);
          const id = params.get('id');
          if (!id) {
            return of<{ metrics: MetricInfo[]; mission: AdminMission | null }>({ metrics, mission: null });
          }
          return this.admin.getMission(id).pipe(
            map((mission) => ({ metrics, mission })),
            catchError((err) => {
              this.error.set(apiErrorMessage(err, 'Não foi possível carregar a missão.'));
              return of<{ metrics: MetricInfo[]; mission: AdminMission | null }>({ metrics, mission: null });
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ mission }) => {
        if (mission) {
          this.mission.set(mission);
          this.patchFromMission(mission);
        } else if (!this.isNew()) {
          // err already set
        } else {
          this.form.patchValue({
            metricKey: this.metrics()[0]?.key ?? '',
          });
        }
        this.loading.set(false);
        this.cdr.markForCheck();
      });

    let initialized = false;
    this.form.controls.metricKey.valueChanges
      .pipe(startWith(this.form.controls.metricKey.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((metricKey) => {
        this.selectedMetricKey.set(metricKey);
        if (initialized) {
          this.form.controls.metricParams.setValue(null, { emitEvent: false });
        }
        initialized = true;
      });
  }

  private patchFromMission(m: AdminMission): void {
    this.form.patchValue({
      key: m.key,
      title: m.title,
      description: m.description ?? '',
      iconUrl: m.iconUrl ?? '',
      category: m.category ?? '',
      isActive: m.isActive,
      startsAt: toDatetimeLocal(m.startsAt),
      endsAt: toDatetimeLocal(m.endsAt),
      metricKey: m.metricKey,
      metricParams: m.metricParams ?? null,
      target: m.target,
      coinReward: m.coinReward,
      xpReward: m.xpReward,
      isReversible: m.isReversible,
      criteria: m.criteria ?? null,
    });
    this.form.markAsPristine();
  }

  private buildPayload(): AdminMissionCreate {
    const v = this.form.getRawValue();
    return {
      key: v.key.trim(),
      title: v.title.trim(),
      description: v.description.trim() || null,
      iconUrl: v.iconUrl.trim() || null,
      category: v.category.trim() || null,
      isActive: v.isActive,
      startsAt: fromDatetimeLocal(v.startsAt),
      endsAt: fromDatetimeLocal(v.endsAt),
      metricKey: v.metricKey,
      metricParams: v.metricParams ?? null,
      target: Number(v.target),
      coinReward: Number(v.coinReward),
      xpReward: Number(v.xpReward),
      isReversible: v.isReversible,
      criteria: v.criteria ?? null,
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
    const id = this.missionId();
    const obs$ = id
      ? this.admin.updateMission(id, payload as AdminMissionPatch)
      : this.admin.createMission(payload);
    obs$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.feedback.showSuccess(id ? 'Missão atualizada' : 'Missão criada');
          void this.router.navigate(['/admin/missions']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível salvar a missão.'));
          this.cdr.markForCheck();
        },
      });
  }

  openPreview(): void {
    const mission = this.mission();
    if (!mission) {
      this.feedback.showError('Salve a missão antes de pré-visualizar.');
      return;
    }
    const data: MissionPreviewDialogData = {
      missionId: mission.id,
      missionTitle: mission.title,
    };
    const isDark = localStorage.getItem(ADMIN_THEME_STORAGE_KEY) === 'dark';
    this.dialog.open(MissionPreviewDialogComponent, {
      data,
      autoFocus: 'first-tabbable',
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
      panelClass: ['admin-mission-preview-dialog', isDark ? 'admin-dialog-dark' : 'admin-dialog-light'],
    });
  }
}
