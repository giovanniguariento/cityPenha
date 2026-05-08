import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  Output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  CriteriaAll,
  CriteriaAny,
  CriteriaLeaf,
  CriteriaNode,
  CriteriaOp,
  isCriteriaAll,
  isCriteriaAny,
  isCriteriaLeaf,
  MetricInfo,
} from '../../../../shared/interface/admin.interface';

type NodeKind = 'all' | 'any' | 'leaf';

const OPS: CriteriaOp[] = ['>=', '<=', '>', '<', '==', '!='];

function emptyLeaf(metricKey = ''): CriteriaLeaf {
  return { metric: metricKey, op: '>=', value: 0, params: null };
}

function emptyGroup(kind: 'all' | 'any'): CriteriaAll | CriteriaAny {
  return kind === 'all' ? { all: [] } : { any: [] };
}

/**
 * Editor recursivo de árvore de critérios (FRONTEND_GAMIFICATION.md §10.3 / API.md §3.7).
 * - Pode ser usado como ControlValueAccessor (`formControlName="criteria"`).
 * - Pode ser usado com binding direto `[value]` / `(valueChange)` (recursão interna).
 *
 * Mantém o template enxuto com helpers públicos de mutação que sempre re-emitem o nó
 * inteiro para o pai. Validação só client-side; o backend valida com Zod.
 */
@Component({
  selector: 'app-criteria-editor',
  standalone: true,
  // Self-reference no `imports` permite a recursão `<app-criteria-editor>` no template.
  imports: [CommonModule, FormsModule, forwardRef(() => CriteriaEditorComponent)],
  templateUrl: './criteria-editor.component.html',
  styleUrl: './criteria-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => CriteriaEditorComponent),
      multi: true,
    },
  ],
})
export class CriteriaEditorComponent implements ControlValueAccessor {
  @Input() metrics: MetricInfo[] = [];
  @Input() showRemove = false;
  @Input() readOnly = false;

  /** Binding-friendly value (usado para recursão); espelha o estado do CVA. */
  @Input() set value(v: CriteriaNode | null | undefined) {
    this.setNode(v ?? null, false);
  }
  @Output() valueChange = new EventEmitter<CriteriaNode | null>();
  @Output() removeRequested = new EventEmitter<void>();

  readonly node = signal<CriteriaNode | null>(null);
  readonly disabled = signal(false);

  readonly ops = OPS;

  private onChange: (v: CriteriaNode | null) => void = () => {};
  private onTouched: () => void = () => {};

  // ── ControlValueAccessor ────────────────────────────────────────────────────

  writeValue(value: CriteriaNode | null): void {
    this.setNode(value ?? null, false);
  }

  registerOnChange(fn: (v: CriteriaNode | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }

  // ── Estado / mutações ───────────────────────────────────────────────────────

  get kind(): NodeKind {
    const n = this.node();
    if (isCriteriaAll(n)) return 'all';
    if (isCriteriaAny(n)) return 'any';
    return 'leaf';
  }

  get children(): CriteriaNode[] {
    const n = this.node();
    if (isCriteriaAll(n)) return n.all;
    if (isCriteriaAny(n)) return n.any;
    return [];
  }

  get leaf(): CriteriaLeaf | null {
    const n = this.node();
    return isCriteriaLeaf(n) ? n : null;
  }

  /** Acceptable params for the currently selected metric (folha). */
  get acceptedParams(): string[] {
    const m = this.metrics.find((x) => x.key === this.leaf?.metric);
    return m?.acceptedParams ?? [];
  }

  isEmpty(): boolean {
    return this.node() == null;
  }

  enable(kind: NodeKind = 'leaf'): void {
    if (kind === 'leaf') {
      this.setNode(emptyLeaf(this.metrics[0]?.key ?? ''), true);
    } else {
      this.setNode(emptyGroup(kind), true);
    }
  }

  clear(): void {
    this.setNode(null, true);
  }

  changeKind(kind: NodeKind): void {
    if (this.kind === kind) return;
    if (kind === 'leaf') {
      this.setNode(emptyLeaf(this.metrics[0]?.key ?? ''), true);
    } else {
      this.setNode(emptyGroup(kind), true);
    }
  }

  // ── Group ops ───────────────────────────────────────────────────────────────

  addChild(kind: NodeKind): void {
    const current = this.node();
    if (!current || (!isCriteriaAll(current) && !isCriteriaAny(current))) return;
    const child: CriteriaNode =
      kind === 'leaf' ? emptyLeaf(this.metrics[0]?.key ?? '') : emptyGroup(kind);
    this.replaceChildren([...this.children, child]);
  }

  updateChild(index: number, child: CriteriaNode | null): void {
    if (child == null) {
      this.removeChild(index);
      return;
    }
    const next = [...this.children];
    next[index] = child;
    this.replaceChildren(next);
  }

  removeChild(index: number): void {
    const next = this.children.filter((_, i) => i !== index);
    this.replaceChildren(next);
  }

  private replaceChildren(items: CriteriaNode[]): void {
    const current = this.node();
    let next: CriteriaNode | null = null;
    if (isCriteriaAll(current)) next = { all: items };
    else if (isCriteriaAny(current)) next = { any: items };
    if (next) this.setNode(next, true);
  }

  // ── Leaf ops ────────────────────────────────────────────────────────────────

  setMetric(metric: string): void {
    const leaf = this.leaf;
    if (!leaf) return;
    this.setNode({ ...leaf, metric, params: null }, true);
  }

  setOp(op: CriteriaOp): void {
    const leaf = this.leaf;
    if (!leaf) return;
    this.setNode({ ...leaf, op }, true);
  }

  setValue(value: number | string): void {
    const leaf = this.leaf;
    if (!leaf) return;
    const num = typeof value === 'number' ? value : Number(value);
    this.setNode({ ...leaf, value: Number.isFinite(num) ? num : 0 }, true);
  }

  setParam(name: string, raw: string): void {
    const leaf = this.leaf;
    if (!leaf) return;
    const params: Record<string, unknown> = { ...(leaf.params ?? {}) };
    const trimmed = raw?.toString().trim();
    if (!trimmed) {
      delete params[name];
    } else if (/id$/i.test(name) && Number.isFinite(Number(trimmed))) {
      params[name] = Number(trimmed);
    } else {
      params[name] = trimmed;
    }
    const nextParams = Object.keys(params).length ? params : null;
    this.setNode({ ...leaf, params: nextParams }, true);
  }

  paramValue(name: string): string {
    const leaf = this.leaf;
    if (!leaf?.params) return '';
    const v = leaf.params[name];
    return v == null ? '' : String(v);
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private setNode(value: CriteriaNode | null, emit: boolean): void {
    this.node.set(value);
    if (emit) {
      this.valueChange.emit(value);
      this.onChange(value);
      this.onTouched();
    }
  }

  requestRemove(): void {
    this.removeRequested.emit();
  }
}
