import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExperienceListItem } from '../../../../shared/interface/experience.interface';
import { XpBadgeComponent } from '../../../../shared/components/xp-badge/xp-badge.component';
import { ExperienceEventMetaComponent } from '../experience-event-meta/experience-event-meta.component';

@Component({
  selector: 'app-experience-list-item',
  standalone: true,
  imports: [RouterLink, XpBadgeComponent, ExperienceEventMetaComponent],
  templateUrl: './experience-list-item.component.html',
  styleUrl: './experience-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceListItemComponent {
  readonly item = input.required<ExperienceListItem>();
}
