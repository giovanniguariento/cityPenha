import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  Input,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Renderiza inputs dinâmicos para `metricParams` (FRONTEND_GAMIFICATION.md §10.2).
 * - `acceptedParams` vem de `MetricInfo.acceptedParams` (ex.: `["categoryId"]`).
 * - Heurística simples: parâmetros terminados em `Id` viram numéricos.
 * - Implementa CVA para se ligar a `formControlName="metricParams"`.
 */
@Component({
  selector: 'app-metric-params-fields',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './metric-params-fields.component.html',
  styleUrl: './metric-params-fields.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MetricParamsFieldsComponent),
      multi: true,
    },
  ],
})
export class MetricParamsFieldsComponent implements ControlValueAccessor {
  @Input() set acceptedParams(value: string[] | null | undefined) {
    this._params.set(value ?? []);
  }
  get acceptedParams(): string[] {
    return this._params();
  }

  readonly _params = signal<string[]>([]);
  readonly value = signal<Record<string, unknown>>({});
  readonly disabled = signal(false);

  private onChange: (v: Record<string, unknown> | null) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: Record<string, unknown> | null): void {
    this.value.set(value ?? {});
  }

  registerOnChange(fn: (v: Record<string, unknown> | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  paramValue(name: string): string {
    const v = this.value()[name];
    return v == null ? '' : String(v);
  }

  setParam(name: string, raw: string): void {
    const trimmed = raw?.toString().trim();
    const next: Record<string, unknown> = { ...this.value() };
    if (!trimmed) {
      delete next[name];
    } else if (/id$/i.test(name) && Number.isFinite(Number(trimmed))) {
      next[name] = Number(trimmed);
    } else {
      next[name] = trimmed;
    }
    this.value.set(next);
    this.onChange(Object.keys(next).length ? next : null);
    this.onTouched();
  }

  isNumeric(name: string): boolean {
    return /id$/i.test(name);
  }
}
