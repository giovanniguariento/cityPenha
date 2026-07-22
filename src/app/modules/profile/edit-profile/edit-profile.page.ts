import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { take } from 'rxjs/operators';
import { NavComponent } from '../../../shared/components/nav/nav.component';
import { LegalFooterComponent } from '../../../shared/components/legal-footer/legal-footer.component';
import { ProfilePageHeaderComponent } from '../../../shared/components/profile-page-header/profile-page-header.component';
import { UpdateMeRequest } from '../../../shared/interface/home.interface';
import { FeedbackService } from '../../../shared/services/feedback.service';
import { AuthService } from '../../../shared/services/auth.service';
import { apiErrorMessage } from '../../../shared/utils/api-error-message';
import { UserStateService } from '../../../core/state/user-state.service';
import { HomeService } from '../../home/services/home.service';

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_ACCEPT = ['image/jpeg', 'image/png', 'image/webp'] as const;

function nicknameOptionalMinLength(control: AbstractControl): ValidationErrors | null {
  const v = (control.value ?? '').toString().trim();
  if (!v) {
    return null;
  }
  if (v.length < 2) {
    return { nicknameMin: true };
  }
  return null;
}

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NavComponent, LegalFooterComponent, ProfilePageHeaderComponent],
  templateUrl: './edit-profile.page.html',
  styleUrl: './edit-profile.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditProfilePage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly homeService = inject(HomeService);
  private readonly feedback = inject(FeedbackService);
  private readonly authService = inject(AuthService);
  private readonly userState = inject(UserStateService);

  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly avatarUploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly avatarUrl = signal<string | null>(null);

  private initialName = '';
  private initialNickname = '';
  private initialAbout = '';
  private persistedAvatarUrl: string | null = null;
  private previewObjectUrl: string | null = null;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    nickname: ['', [Validators.maxLength(40), nicknameOptionalMinLength]],
    about: ['', [Validators.maxLength(2000)]],
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.cdr.markForCheck());
    this.destroyRef.onDestroy(() => this.revokePreviewObjectUrl());
  }

  ngOnInit(): void {
    forkJoin({
      me: this.homeService.getMe().pipe(take(1)),
      fb: this.userState.user$.pipe(take(1)),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ me, fb }) => {
          const u = me.user;
          const url = (u.photoUrl && u.photoUrl.trim()) || fb?.photoURL || null;
          this.persistedAvatarUrl = url;
          this.avatarUrl.set(url);
          this.initialName = u.name ?? '';
          this.initialNickname = (u.nickname ?? '').toString();
          this.initialAbout = (u.about ?? '').toString();
          this.form.patchValue(
            {
              name: this.initialName,
              nickname: this.initialNickname,
              about: this.initialAbout,
            },
            { emitEvent: false }
          );
          this.form.markAsPristine();
          this.loading.set(false);
          this.error.set(null);
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.loading.set(false);
          this.error.set(apiErrorMessage(err, 'Não foi possível carregar o perfil.'));
          this.cdr.markForCheck();
        },
      });
  }

  goBack(): void {
    void this.router.navigate(['/profile']);
  }

  onEditPhotoClick(fileInput: HTMLInputElement): void {
    if (this.avatarUploading() || this.loading()) {
      return;
    }
    fileInput.click();
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }

    if (!AVATAR_ACCEPT.includes(file.type as (typeof AVATAR_ACCEPT)[number])) {
      this.feedback.showError('Use JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      this.feedback.showError('A imagem deve ter no máximo 2 MB.');
      return;
    }

    const previousUrl = this.persistedAvatarUrl;
    this.revokePreviewObjectUrl();
    this.previewObjectUrl = URL.createObjectURL(file);
    this.avatarUrl.set(this.previewObjectUrl);

    this.avatarUploading.set(true);
    this.cdr.markForCheck();

    this.homeService
      .uploadAvatar(file)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (user) => {
          const newUrl = (user.photoUrl && user.photoUrl.trim()) || null;
          this.revokePreviewObjectUrl();
          this.persistedAvatarUrl = newUrl;
          this.avatarUrl.set(newUrl);
          this.avatarUploading.set(false);
          if (newUrl) {
            void this.authService.updatePhotoUrl(newUrl).catch(() => {
              // Nav sync is best-effort; backend photo is already saved.
            });
          }
          this.feedback.showSuccess('Foto atualizada');
          this.cdr.markForCheck();
        },
        error: (err: unknown) => {
          this.revokePreviewObjectUrl();
          this.avatarUrl.set(previousUrl);
          this.avatarUploading.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível atualizar a foto.'));
          this.cdr.markForCheck();
        },
      });
  }

  private revokePreviewObjectUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = null;
    }
  }

  hasChanges(): boolean {
    if (this.loading()) {
      return false;
    }
    const v = this.form.getRawValue();
    const name = v.name.trim();
    const nick = v.nickname.trim();
    const about = v.about.trim();
    return (
      name !== this.initialName.trim() ||
      nick !== this.initialNickname.trim() ||
      about !== this.initialAbout.trim()
    );
  }

  private buildPatchBody(): UpdateMeRequest | null {
    const name = this.form.controls.name.value.trim();
    const nick = this.form.controls.nickname.value.trim();
    const about = this.form.controls.about.value.trim();

    const body: UpdateMeRequest = {};
    if (name !== this.initialName.trim()) {
      body.name = name;
    }
    if (nick !== this.initialNickname.trim()) {
      body.nickname = nick.length === 0 ? null : nick;
    }
    if (about !== this.initialAbout.trim()) {
      body.about = about.length === 0 ? null : about;
    }
    return Object.keys(body).length > 0 ? body : null;
  }

  onSubmit(): void {
    if (this.submitting() || this.loading()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }
    const body = this.buildPatchBody();
    if (!body) {
      this.feedback.showError('Não há alterações para guardar.');
      return;
    }
    this.submitting.set(true);
    this.homeService
      .updateMe(body)
      .pipe(take(1), takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.feedback.showSuccess('Perfil atualizado');
          void this.router.navigate(['/profile']);
        },
        error: (err: unknown) => {
          this.submitting.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível guardar o perfil.'));
          this.cdr.markForCheck();
        },
      });
  }
}
