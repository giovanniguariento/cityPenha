import {
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
import { normalizeVideoEmbedUrl } from '../../utils/normalize-video-embed-url';

export type MediaInsertKind = 'image' | 'video';

export type MediaInsertDialogData = {
  kind: MediaInsertKind;
};

export type MediaInsertDialogResult =
  | { source: 'gallery' }
  | { source: 'url'; url: string };

type Step = 'choose' | 'url';

@Component({
  selector: 'app-media-insert-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule],
  templateUrl: './media-insert-dialog.component.html',
  styleUrl: './media-insert-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaInsertDialogComponent {
  @ViewChild('urlInput') private readonly urlInput?: ElementRef<HTMLInputElement>;

  readonly kind: MediaInsertKind;
  readonly step = signal<Step>('choose');
  readonly error = signal<string | null>(null);
  value = '';

  constructor(
    private readonly dialogRef: MatDialogRef<
      MediaInsertDialogComponent,
      MediaInsertDialogResult | null
    >,
    @Inject(MAT_DIALOG_DATA) data: MediaInsertDialogData
  ) {
    this.kind = data.kind;
  }

  get title(): string {
    return this.kind === 'image' ? 'Adicionar imagem' : 'Adicionar vídeo';
  }

  get urlPlaceholder(): string {
    return this.kind === 'image'
      ? 'https://…'
      : 'https://… (arquivo, YouTube ou Vimeo)';
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  chooseGallery(): void {
    this.dialogRef.close({ source: 'gallery' });
  }

  chooseUrl(): void {
    this.step.set('url');
    this.error.set(null);
    queueMicrotask(() => {
      const el = this.urlInput?.nativeElement;
      if (!el) return;
      el.focus();
      el.select();
    });
  }

  backToChoose(): void {
    this.step.set('choose');
    this.error.set(null);
  }

  confirmUrl(): void {
    const trimmed = this.value.trim();
    if (!trimmed) {
      this.error.set(
        this.kind === 'image' ? 'Informe a URL da imagem.' : 'Informe a URL do vídeo.'
      );
      return;
    }

    if (this.kind === 'image') {
      if (!/^https:\/\//i.test(trimmed)) {
        this.error.set('A URL da imagem deve começar com https://');
        return;
      }
      this.error.set(null);
      this.dialogRef.close({ source: 'url', url: trimmed });
      return;
    }

    const normalized = normalizeVideoEmbedUrl(trimmed);
    if (!normalized) {
      this.error.set(
        'Use um link https de arquivo (mp4/webm), YouTube ou Vimeo.'
      );
      return;
    }
    this.error.set(null);
    this.dialogRef.close({ source: 'url', url: trimmed });
  }

  onValueChange(next: string): void {
    this.value = next;
    if (this.error()) this.error.set(null);
  }
}
