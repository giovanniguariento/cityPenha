import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';

/**
 * Cabeçalho vermelho partilhado entre Perfil e Editar perfil (mesmo visual: fundo, cantos inferiores, barra superior).
 */
@Component({
  selector: 'app-profile-page-header',
  standalone: true,
  templateUrl: './profile-page-header.component.html',
  styleUrl: './profile-page-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class ProfilePageHeaderComponent {}
