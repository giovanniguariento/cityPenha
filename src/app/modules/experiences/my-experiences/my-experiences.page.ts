import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { APP_ASSETS } from '../../../shared/constants/app-assets';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { MineListCardComponent } from '../../../shared/components/mine-list-card/mine-list-card.component';
import { ExperienceMine, ExperienceStatus } from '../../../shared/interface/experience.interface';
import { FeedbackService } from '../../../shared/services/feedback.service';
import { apiErrorMessage } from '../../../shared/utils/api-error-message';
import { ExperienceService } from '../services/experience.service';

@Component({
  selector: 'app-my-experiences',
  standalone: true,
  imports: [RouterLink, MineListCardComponent],
  templateUrl: './my-experiences.page.html',
  styleUrl: './my-experiences.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MyExperiencesPage implements OnInit {
  private readonly experienceService = inject(ExperienceService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly feedback = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly logoUrl = APP_ASSETS.logo;
  readonly items = signal<ExperienceMine[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);
  readonly openMenuId = signal<string | null>(null);

  ngOnInit(): void {
    this.load();
  }

  retry(): void {
    this.load();
  }

  toggleMenu(id: string, event: Event): void {
    event.stopPropagation();
    this.openMenuId.update((current) => (current === id ? null : id));
  }

  closeMenu(): void {
    this.openMenuId.set(null);
  }

  viewItem(item: ExperienceMine): void {
    this.closeMenu();
    void this.router.navigate(['/experiencias', item.slug]);
  }

  editItem(item: ExperienceMine): void {
    this.closeMenu();
    void this.router.navigate(['/minhas-experiencias', item.id, 'editar']);
  }

  confirmDelete(item: ExperienceMine): void {
    this.closeMenu();
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          message: `Excluir “${item.title || 'esta experiência'}”? Esta ação não pode ser desfeita.`,
          confirmLabel: 'Excluir',
          cancelLabel: 'Cancelar',
        },
      }
    );

    ref
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmed) => {
        if (!confirmed) return;
        this.deleteItem(item);
      });
  }

  subtitleFor(item: ExperienceMine): string[] {
    return [this.statusLabel(item.status), item.meta.dateLabel].filter(Boolean);
  }

  private statusLabel(status: ExperienceStatus | string): string {
    switch (status) {
      case 'published':
        return 'Publicado';
      case 'draft':
        return 'Rascunho';
      case 'archived':
        return 'Arquivado';
      default:
        return status;
    }
  }

  private deleteItem(item: ExperienceMine): void {
    if (this.deletingId() != null) return;
    this.deletingId.set(item.id);
    this.experienceService
      .delete(item.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.items.update((list) => list.filter((i) => i.id !== item.id));
          this.deletingId.set(null);
          this.feedback.showSuccess('Experiência excluída.');
        },
        error: (err: unknown) => {
          this.deletingId.set(null);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível excluir.'));
        },
      });
  }

  private load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.experienceService
      .listMine()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.items.set(list);
          this.loading.set(false);
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar suas experiências.'));
        },
      });
  }
}
