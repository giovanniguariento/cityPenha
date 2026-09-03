import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { PwaService } from '../../services/pwa.service';

/**
 * Passo a passo de instalação para os navegadores sem prompt nativo: Safari no
 * iOS e os que só instalam pelo menu. Quem exibe controla a visibilidade.
 */
@Component({
  selector: 'app-install-steps-sheet',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './install-steps-sheet.component.html',
  styleUrl: './install-steps-sheet.component.scss',
})
export class InstallStepsSheetComponent {
  readonly isIos = inject(PwaService).isIos;

  /** Emitido ao fechar a folha de instruções. */
  readonly closed = output<void>();
}
