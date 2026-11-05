import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ExperienceMeta } from '../../../../shared/interface/experience.interface';

@Component({
  selector: 'app-experience-event-meta',
  standalone: true,
  templateUrl: './experience-event-meta.component.html',
  styleUrl: './experience-event-meta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExperienceEventMetaComponent {
  readonly meta = input.required<ExperienceMeta>();
  /** Compact row for list items / featured cards (venue + date + time). */
  readonly compact = input(true);
  /** Light text for overlays on dark images. */
  readonly onDark = input(false);
}
