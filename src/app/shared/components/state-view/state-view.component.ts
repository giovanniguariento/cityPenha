import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type StateViewVariant = 'error' | 'empty' | 'offline';

/**
 * Estado reutilizável de tela (erro / vazio / offline).
 * Segue o padrão: ícone + título + mensagem amigável + ação de recuperação,
 * centralizado no espaço disponível. Nunca deve receber detalhe técnico cru.
 */
@Component({
  selector: 'app-state-view',
  standalone: true,
  templateUrl: './state-view.component.html',
  styleUrl: './state-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StateViewComponent {
  /** Define o ícone/tom do estado. */
  readonly variant = input<StateViewVariant>('error');
  /** Título curto e humano. */
  readonly title = input<string>('');
  /** Texto de apoio amigável. */
  readonly message = input<string>('');
  /** Rótulo do botão de ação. */
  readonly retryLabel = input<string>('Tentar novamente');
  /** Mostra o botão de ação. */
  readonly showRetry = input<boolean>(true);
  /** Ocupa a altura visível (centraliza entre topo e navbar). */
  readonly fill = input<boolean>(false);

  /** Emitido ao clicar no botão de ação. */
  readonly retry = output<void>();
}
