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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { combineLatest, of, switchMap } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  AdminBadge,
  AdminBadgeCreate,
  AdminBadgePatch,
  CriteriaNode,
  MetricInfo,
} from '../../../../shared/interface/admin.interface';
import { FeedbackService } from '../../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import {
  CriteriaEditorComponent,
} from '../../components/criteria-editor/criteria-editor.component';
import { AdminService } from '../../services/admin.service';

const KEY_REGEX = /^[a-z0-9_]+$/;

function keyValidator(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '').toString().trim();
  if (!v) return null;
  return KEY_REGEX.test(v) ? null : { keyFormat: true };
}

/** Espelha o refine Zod do backend: precisa ter (metricKey + threshold) OU criteria. */
function badgeRuleValidator(group: AbstractControl): ValidationErrors | null {
  const metricKey = (group.get('metricKey')?.value ?? '').toString().trim();
  const thresholdRaw = group.get('threshold')?.value;
  const threshold = thresholdRaw === null || thresholdRaw === '' ? null : Number(thresholdRaw);
  const criteria = group.get('criteria')?.value;
  const hasMetricRule = !!metricKey && threshold != null && Number.isFinite(threshold);
  const hasCriteria = !!criteria;
  if (!hasMetricRule && !hasCriteria) {
    return { badgeRule: true };
  }
  return null;
}

@Component({
  selector: 'app-admin-badge-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, CriteriaEditorComponent],
  templateUrl: './badge-form.page.html',
  styleUrl: './badge-form.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminBadgeFormPage {
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
  readonly metrics = signal<MetricInfo[]>([]);

  readonly badgeId = toSignal(
    this.route.paramMap.pipe(map((p) => p.get('id'))),
    { initialValue: null }
  );

  readonly isNew = computed(() => !this.badgeId());
  readonly title = computed(() => (this.isNew() ? 'Nova insígnia' : 'Editar insígnia'));

  readonly form = this.fb.nonNullable.group(
    {
      key: ['', [Validators.required, Validators.maxLength(60), keyValidator]],
      title: ['', [Validators.required, Validators.maxLength(120)]],
      description: ['', [Validators.maxLength(500)]],
      iconUrl: ['', [Validators.maxLength(500)]],
      metricKey: [''],
      threshold: this.fb.nonNullable.control<number | null>(null),
      criteria: this.fb.nonNullable.control<CriteriaNode | null>(null),
      isActive: [true],
    },
    { validators: badgeRuleValidator }
  );

  constructor() {
    combineLatest([this.admin.getMetrics(), this.route.paramMap])
      .pipe(
        switchMap(([metrics, params]) => {
          this.metrics.set(metrics);
          const id = params.get('id');
          if (!id) return of<{ badge: AdminBadge | null }>({ badge: null });
          return this.admin.getBadge(id).pipe(
            map((badge) => ({ badge })),
            catchError((err) => {
              this.error.set(apiErrorMessage(err, 'Não foi possível carregar a insígnia.'));
              return of<{ badge: AdminBadge | null }>({ badge: null });
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(({ badge }) => {
        if (badge) {
          this.patchFromBadge(badge);
        }
        this.loading.set(false);
        this.cdr.markForCheck();
      });
  }

  private patchFromBadge(b: AdminBadge): void {
    this.form.patchValue({
      key: b.key,
      title: b.title,
      description: b.description ?? '',
      iconUrl: b.iconUrl ?? '',
      metricKey: b.metricKey ?? '',
      threshold: b.threshold ?? null,
      criteria: b.criteria ?? null,
      isActive: b.isActive,
    });
    this.form.markAsPristine();
  }

  private buildPayload(): AdminBadgeCreate {
    const v = this.form.getRawValue();
    const metricKey = v.metricKey.trim() || null;
    const threshold = v.threshold === null || v.threshold === undefined ? null : Number(v.threshold);
    return {
      key: v.key.trim(),
      title: v.title.trim(),
      description: v.description.trim() || null,
      iconUrl: v.iconUrl.trim() || null,
      metricKey,
      threshold: metricKey ? threshold : null,
      criteria: v.criteria ?? null,
      isActive: v.isActive,
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
    const id = this.badgeId();
    const obs$ = id
      ? this.admin.updateBadge(id, payload as AdminBadgePatch)
      : this.admin.createBadge(payload);
    obs$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.feedback.showSuccess(id ? 'Insígnia atualizada' : 'Insígnia criada');
          void this.router.navigate(['/admin/badges']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível salvar a insígnia.'));
          this.cdr.markForCheck();
        },
      });
  }
}
