import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { PwaService } from '../../services/pwa.service';
import { InstallStepsSheetComponent } from '../install-steps-sheet/install-steps-sheet.component';

@Component({
  selector: 'app-install-prompt',
  standalone: true,
  imports: [InstallStepsSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './install-prompt.component.html',
  styleUrl: './install-prompt.component.scss',
})
export class InstallPromptComponent {
  private readonly pwa = inject(PwaService);

  /** Mostra o passo a passo de instalação manual. */
  readonly showSteps = signal(false);

  readonly canInstall = this.pwa.canInstall;
  readonly visible = this.pwa.showFloatingPrompt;

  async install(): Promise<void> {
    await this.pwa.promptInstall();
  }

  openSteps(): void {
    this.showSteps.set(true);
  }

  closeSteps(): void {
    this.showSteps.set(false);
  }

  /** Dispensa o banner. O convite continua acessível pelo slide da home. */
  dismiss(): void {
    this.showSteps.set(false);
    this.pwa.dismissFloatingPrompt();
  }
}
