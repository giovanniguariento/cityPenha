import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  signal,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommentView } from '../../../../../shared/interface/home.interface';

@Component({
  selector: 'app-comment-input',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './comment-input.component.html',
  styleUrl: './comment-input.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentInputComponent {
  @Input() replyingTo: CommentView | null = null;
  @Input() submitting = false;
  @Input() disabled = false;

  @Output() submitted = new EventEmitter<{ content: string; parentId?: string }>();
  @Output() replyDismissed = new EventEmitter<void>();
  @Output() fieldClicked = new EventEmitter<void>();

  readonly inputValue = signal('');
  readonly isMultiline = signal(false);
  private readonly fieldRef = viewChild<ElementRef<HTMLTextAreaElement>>('field');
  private static readonly FIELD_LINE_HEIGHT_PX = 20;
  private static readonly FIELD_MAX_HEIGHT_PX = 120;

  constructor() {
    afterNextRender(() => {
      const field = this.fieldRef()?.nativeElement;
      if (field) {
        this.adjustFieldHeight(field);
      }
    });
  }

  get charCount(): number {
    return this.inputValue().length;
  }

  get nearLimit(): boolean {
    return this.charCount > 1800;
  }

  onFieldClick(): void {
    if (this.disabled) {
      this.fieldClicked.emit();
    }
  }

  onFieldFocus(event: FocusEvent): void {
    if (!this.disabled) {
      return;
    }
    (event.target as HTMLTextAreaElement).blur();
    this.fieldClicked.emit();
  }

  onInput(event: Event): void {
    if (this.disabled) {
      return;
    }
    const field = event.target as HTMLTextAreaElement;
    this.inputValue.set(field.value);
    this.adjustFieldHeight(field);
  }

  private adjustFieldHeight(field: HTMLTextAreaElement): void {
    field.style.height = `${CommentInputComponent.FIELD_LINE_HEIGHT_PX}px`;
    const nextHeight = Math.min(field.scrollHeight, CommentInputComponent.FIELD_MAX_HEIGHT_PX);
    field.style.height = `${Math.max(CommentInputComponent.FIELD_LINE_HEIGHT_PX, nextHeight)}px`;
    this.isMultiline.set(nextHeight > CommentInputComponent.FIELD_LINE_HEIGHT_PX);
  }

  private resetFieldHeight(): void {
    const field = this.fieldRef()?.nativeElement;
    if (!field) {
      return;
    }
    field.style.height = `${CommentInputComponent.FIELD_LINE_HEIGHT_PX}px`;
    this.isMultiline.set(false);
  }

  onSendClick(): void {
    if (this.disabled) {
      this.fieldClicked.emit();
      return;
    }
    this.onSubmit();
  }

  onSubmit(): void {
    const content = this.inputValue().trim();
    if (!content || content.length > 2000 || this.submitting || this.disabled) {
      return;
    }
    const payload: { content: string; parentId?: string } = { content };
    if (this.replyingTo?.id) {
      payload.parentId = this.replyingTo.id;
    }
    this.submitted.emit(payload);
    this.inputValue.set('');
    this.resetFieldHeight();
  }
}
