import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ExperienceListItem } from '../../../../shared/interface/experience.interface';
import { XpBadgeComponent } from '../../../../shared/components/xp-badge/xp-badge.component';
import { ExperienceEventMetaComponent } from '../experience-event-meta/experience-event-meta.component';

@Component({
  selector: 'app-experience-featured-card',
  standalone: true,
  imports: [RouterLink, XpBadgeComponent, ExperienceEventMetaComponent],
  templateUrl: './experience-featured-card.component.html',
  styleUrl: './experience-featured-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceFeaturedCardComponent {
  readonly item = input.required<ExperienceListItem>();
}
