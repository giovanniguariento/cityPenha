import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  OnDestroy,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ADSENSE_ARTICLE_SLOT, ADSENSE_CLIENT } from '../../constants/adsense';
import { AdsenseLoaderService } from '../../services/adsense-loader.service';

/**
 * Manual AdSense display unit. Renders only when a slot ID is configured and
 * the parent has already called `AdsenseLoaderService.enable()` (content gate).
 */
@Component({
  selector: 'app-adsense-unit',
  standalone: true,
  template: `
    @if (slot()) {
      <aside class="adsense-unit" aria-label="Publicidade">
        <ins
          #adIns
          class="adsbygoogle"
          style="display:block"
          [attr.data-ad-client]="client"
          [attr.data-ad-slot]="slot()"
          data-ad-format="auto"
          data-full-width-responsive="true"
        ></ins>
      </aside>
    }
  `,
  styles: [
    `
      .adsense-unit {
        margin: 8px 0 4px;
        min-height: 90px;
        overflow: hidden;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdsenseUnitComponent implements OnDestroy {
  private readonly adsense = inject(AdsenseLoaderService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly adIns = viewChild<ElementRef<HTMLElement>>('adIns');

  /** Override slot; defaults to the shared article unit. */
  readonly adSlot = input<string>(ADSENSE_ARTICLE_SLOT);

  readonly client = ADSENSE_CLIENT;
  private pushed = false;

  constructor() {
    afterNextRender(() => {
      this.tryPush();
    });
  }

  slot(): string {
    return (this.adSlot() || ADSENSE_ARTICLE_SLOT).trim();
  }

  ngOnDestroy(): void {
    this.pushed = false;
  }

  private tryPush(): void {
    if (!isPlatformBrowser(this.platformId) || this.pushed || !this.slot()) {
      return;
    }
    if (!this.adsense.isEnabled()) {
      return;
    }
    const el = this.adIns()?.nativeElement;
    if (!el || el.getAttribute('data-adsbygoogle-status')) {
      return;
    }
    this.pushed = true;
    this.adsense.pushAd();
  }
}
