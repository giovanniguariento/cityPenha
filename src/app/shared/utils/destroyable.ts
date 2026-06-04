import { Directive, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';

/**
 * Base directive that provides a reusable destroy$ Subject and implements OnDestroy.
 * Components can extend this to avoid repeating the same takeUntil + Subject teardown logic.
 *
 * The @Directive decorator prevents the Angular compiler error NG2007 when a class
 * uses Angular lifecycle hooks but isn't itself an Angular-decorated type.
 */
@Directive()
export abstract class Destroyable implements OnDestroy {
  protected readonly destroy$ = new Subject<void>();

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

