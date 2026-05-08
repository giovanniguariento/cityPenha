import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { apiErrorMessage } from '../../../../shared/utils/api-error-message';
import { PreviewResponse } from '../../../../shared/interface/admin.interface';
import { AdminService } from '../../services/admin.service';

export interface MissionPreviewDialogData {
  missionId: string;
  missionTitle: string;
}

interface ObservedRow {
  metric: string;
  value: number;
}

@Component({
  selector: 'app-mission-preview-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './mission-preview-dialog.component.html',
  styleUrl: './mission-preview-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MissionPreviewDialogComponent {
  private readonly admin = inject(AdminService);
  private readonly destroyRef = inject(DestroyRef);
  readonly data = inject<MissionPreviewDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<MissionPreviewDialogComponent>);

  readonly userId = signal('');
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<PreviewResponse | null>(null);

  observed(): ObservedRow[] {
    const r = this.result();
    if (!r) return [];
    return Object.entries(r.observedMetrics).map(([metric, value]) => ({ metric, value }));
  }

  setUserId(value: string): void {
    this.userId.set(value);
  }

  run(): void {
    const uid = this.userId().trim();
    if (!uid) {
      this.error.set('Informe o userId.');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.admin
      .previewMission(this.data.missionId, uid)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.loading.set(false);
          this.result.set(res);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Falha ao executar pré-visualização.'));
        },
      });
  }

  close(): void {
    this.ref.close();
  }
}
