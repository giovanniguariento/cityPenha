import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Inject,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

export type UrlPromptMode = 'link' | 'image';

export interface UrlPromptDialogData {
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, empty confirm returns '' (used to remove a link). */
  allowEmpty?: boolean;
  mode: UrlPromptMode;
}

@Component({
  selector: 'app-url-prompt-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './url-prompt-dialog.component.html',
  styleUrl: './url-prompt-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UrlPromptDialogComponent implements AfterViewInit {
  @ViewChild('urlInput') private readonly urlInput?: ElementRef<HTMLInputElement>;

  readonly title: string;
  readonly placeholder: string;
  readonly confirmLabel: string;
  readonly cancelLabel: string;
  readonly allowEmpty: boolean;
  readonly mode: UrlPromptMode;

  value = '';
  readonly error = signal<string | null>(null);

  constructor(
    private readonly dialogRef: MatDialogRef<UrlPromptDialogComponent, string | null>,
    @Inject(MAT_DIALOG_DATA) data: UrlPromptDialogData
  ) {
    this.title = data.title;
    this.placeholder = data.placeholder ?? 'https://';
    this.confirmLabel = data.confirmLabel ?? 'Confirmar';
    this.cancelLabel = data.cancelLabel ?? 'Cancelar';
    this.allowEmpty = data.allowEmpty ?? false;
    this.mode = data.mode;
    this.value = data.initialValue ?? '';
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => {
      const el = this.urlInput?.nativeElement;
      if (!el) return;
      el.focus();
      el.select();
    });
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  confirm(): void {
    const trimmed = this.value.trim();

    if (!trimmed) {
      if (this.allowEmpty) {
        this.dialogRef.close('');
        return;
      }
      this.error.set(
        this.mode === 'image' ? 'Informe a URL da imagem.' : 'Informe a URL do link.'
      );
      return;
    }

    if (this.mode === 'image') {
      if (!/^https:\/\//i.test(trimmed)) {
        this.error.set('A URL da imagem deve começar com https://');
        return;
      }
    } else if (!isSafeHref(trimmed)) {
      this.error.set('Use http://, https:// ou um caminho que comece com /.');
      return;
    }

    this.error.set(null);
    this.dialogRef.close(trimmed);
  }

  onValueChange(next: string): void {
    this.value = next;
    if (this.error()) this.error.set(null);
  }
}

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  );
}
