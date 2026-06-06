import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs';
import { CommentView } from '../../../../../shared/interface/home.interface';
import { CommentService } from '../../../services/comment.service';
import { FeedbackService } from '../../../../../shared/services/feedback.service';
import { Destroyable } from '../../../../../shared/utils/destroyable';
import { apiErrorMessage } from '../../../../../shared/utils/api-error-message';

function avatarColor(authorId: string): string {
  const colors = ['#e57373', '#f06292', '#ba68c8', '#64b5f6', '#4db6ac', '#81c784', '#ffd54f', '#ff8a65'];
  let hash = 0;
  for (const ch of authorId) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

@Component({
  selector: 'app-comment-item',
  standalone: true,
  imports: [CommonModule, CommentItemComponent],
  templateUrl: './comment-item.component.html',
  styleUrl: './comment-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommentItemComponent extends Destroyable implements OnChanges {
  @Input({ required: true }) comment!: CommentView;
  @Input() currentUserId: string | null = null;
  @Input() isReply = false;
  @Input() lastDeletedCommentId: string | null = null;

  @Output() likeToggled = new EventEmitter<{ commentId: string; liked: boolean; likeCount: number }>();
  @Output() replyRequested = new EventEmitter<CommentView>();
  @Output() deleteRequested = new EventEmitter<string>();
  @Output() authRequired = new EventEmitter<void>();

  private readonly commentService = inject(CommentService);
  private readonly feedback = inject(FeedbackService);

  readonly liked = signal(false);
  readonly likeCount = signal(0);
  readonly likePending = signal(false);
  readonly expanded = signal(false);
  readonly replies = signal<CommentView[]>([]);
  readonly loadingReplies = signal(false);
  readonly repliesNextCursor = signal<string | null>(null);
  private repliesLoaded = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['comment']) {
      this.liked.set(this.comment.liked ?? false);
      this.likeCount.set(this.comment.likeCount ?? 0);
    }
    if (changes['lastDeletedCommentId']?.currentValue) {
      const deletedId = changes['lastDeletedCommentId'].currentValue as string;
      const hadReply = this.replies().some((r) => r.id === deletedId);
      if (hadReply) {
        this.replies.update((list) => list.filter((r) => r.id !== deletedId));
        this.comment = { ...this.comment, replyCount: Math.max(0, (this.comment.replyCount ?? 0) - 1) };
      }
    }
  }

  get avatarInitials(): string {
    return initials(this.comment.author.name);
  }

  get avatarBgColor(): string {
    return avatarColor(this.comment.author.id);
  }

  onLike(): void {
    if (!this.currentUserId) {
      this.authRequired.emit();
      return;
    }
    if (this.likePending()) return;

    const prevLiked = this.liked();
    const prevCount = this.likeCount();
    const newLiked = !prevLiked;
    const newCount = Math.max(0, prevCount + (prevLiked ? -1 : 1));

    this.liked.set(newLiked);
    this.likeCount.set(newCount);
    this.likePending.set(true);

    this.commentService
      .toggleLike(this.comment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.likePending.set(false);
          this.liked.set(res.liked);
          this.likeCount.set(res.likeCount);
          this.likeToggled.emit({ commentId: this.comment.id, liked: res.liked, likeCount: res.likeCount });
        },
        error: (err: unknown) => {
          this.likePending.set(false);
          this.liked.set(prevLiked);
          this.likeCount.set(prevCount);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível registrar a curtida.'));
        },
      });
  }

  toggleReplies(): void {
    const isExpanded = this.expanded();
    this.expanded.set(!isExpanded);
    if (!isExpanded && !this.repliesLoaded) {
      this.loadReplies();
    }
  }

  private loadReplies(cursor?: string): void {
    this.loadingReplies.set(true);
    this.commentService
      .listReplies(this.comment.id, { cursor, limit: 10 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.loadingReplies.set(false);
          this.replies.update((prev) => cursor ? [...prev, ...res.data] : res.data);
          this.repliesNextCursor.set(res.meta.nextCursor);
          this.repliesLoaded = true;
        },
        error: (err: unknown) => {
          this.loadingReplies.set(false);
          this.feedback.showError(apiErrorMessage(err, 'Não foi possível carregar as respostas.'));
        },
      });
  }

  loadMoreReplies(): void {
    const cursor = this.repliesNextCursor();
    if (cursor) {
      this.loadReplies(cursor);
    }
  }

  onDelete(): void {
    this.deleteRequested.emit(this.comment.id);
  }
}
