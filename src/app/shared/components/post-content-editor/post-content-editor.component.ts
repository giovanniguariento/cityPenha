import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  PLATFORM_ID,
  effect,
  forwardRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Image from '@tiptap/extension-image';
import { TiptapEditorDirective } from 'ngx-tiptap';
import {
  UrlPromptDialogComponent,
  UrlPromptDialogData,
} from '../url-prompt-dialog/url-prompt-dialog.component';

export type PostContentEditorMode = 'caption' | 'article';

@Component({
  selector: 'app-post-content-editor',
  standalone: true,
  imports: [TiptapEditorDirective],
  templateUrl: './post-content-editor.component.html',
  styleUrl: './post-content-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PostContentEditorComponent),
      multi: true,
    },
  ],
})
export class PostContentEditorComponent implements ControlValueAccessor, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = inject(MatDialog);
  private lastMode: PostContentEditorMode | null = null;

  /** Caption = short allowlist; article = headings, quote, hr, image. */
  readonly mode = input<PostContentEditorMode>('caption');
  readonly placeholder = input('Escreva…');
  readonly ariaLabel = input('Conteúdo da postagem');

  /** Emits plain text for emptiness checks / fallbacks. */
  readonly plainTextChange = output<string>();

  readonly editor = signal<Editor | null>(null);
  readonly active = signal({
    bold: false,
    italic: false,
    underline: false,
    bulletList: false,
    orderedList: false,
    link: false,
    heading2: false,
    heading3: false,
    blockquote: false,
  });

  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;
  private writing = false;
  private lastHtml = '';

  constructor() {
    // Recreate editor when mode changes (caption ↔ article extension sets differ).
    effect(() => {
      const mode = this.mode();
      const placeholder = this.placeholder();
      if (!isPlatformBrowser(this.platformId)) return;

      const modeChanged = this.lastMode !== mode;
      const needsInit = !this.editor();
      if (!modeChanged && !needsInit) {
        // Placeholder/aria-only changes: keep the same editor instance.
        return;
      }
      this.lastMode = mode;

      this.destroyEditor();
      const ed = this.createEditor(mode, placeholder);
      this.editor.set(ed);

      if (this.lastHtml) {
        this.writing = true;
        ed.commands.setContent(this.lastHtml, { emitUpdate: false });
        this.writing = false;
      }
    });

    this.destroyRef.onDestroy(() => this.destroyEditor());
  }

  ngOnDestroy(): void {
    this.destroyEditor();
  }

  writeValue(value: string | null): void {
    const html = typeof value === 'string' ? value : '';
    this.lastHtml = html;
    const ed = this.editor();
    if (!ed) return;
    const current = ed.getHTML();
    if (normalizeEditorHtml(current) === normalizeEditorHtml(html)) return;
    this.writing = true;
    ed.commands.setContent(html || '', { emitUpdate: false });
    this.writing = false;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    const ed = this.editor();
    if (!ed) return;
    ed.setEditable(!isDisabled);
  }

  toggleBold(): void {
    this.editor()?.chain().focus().toggleBold().run();
  }

  toggleItalic(): void {
    this.editor()?.chain().focus().toggleItalic().run();
  }

  toggleUnderline(): void {
    this.editor()?.chain().focus().toggleUnderline().run();
  }

  toggleBulletList(): void {
    this.editor()?.chain().focus().toggleBulletList().run();
  }

  toggleOrderedList(): void {
    this.editor()?.chain().focus().toggleOrderedList().run();
  }

  toggleHeading(level: 2 | 3): void {
    this.editor()?.chain().focus().toggleHeading({ level }).run();
  }

  toggleBlockquote(): void {
    this.editor()?.chain().focus().toggleBlockquote().run();
  }

  insertHorizontalRule(): void {
    this.editor()?.chain().focus().setHorizontalRule().run();
  }

  setLink(): void {
    const ed = this.editor();
    if (!ed) return;
    const prev = ed.getAttributes('link')['href'] as string | undefined;
    const data: UrlPromptDialogData = {
      title: 'URL do link',
      placeholder: 'https://',
      initialValue: prev ?? 'https://',
      allowEmpty: true,
      mode: 'link',
      confirmLabel: 'Aplicar',
    };

    this.dialog
      .open<UrlPromptDialogComponent, UrlPromptDialogData, string | null>(UrlPromptDialogComponent, {
        data,
        width: 'min(92vw, 420px)',
        autoFocus: false,
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((url) => {
        if (url === null || url === undefined) return;
        const current = this.editor();
        if (!current) return;
        const trimmed = url.trim();
        if (!trimmed) {
          current.chain().focus().extendMarkRange('link').unsetLink().run();
          return;
        }
        if (!isSafeHref(trimmed)) return;
        current.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
      });
  }

  insertImage(): void {
    const ed = this.editor();
    if (!ed || this.mode() !== 'article') return;
    const data: UrlPromptDialogData = {
      title: 'URL da imagem',
      placeholder: 'https://',
      initialValue: '',
      allowEmpty: false,
      mode: 'image',
      confirmLabel: 'Inserir',
    };

    this.dialog
      .open<UrlPromptDialogComponent, UrlPromptDialogData, string | null>(UrlPromptDialogComponent, {
        data,
        width: 'min(92vw, 420px)',
        autoFocus: false,
        restoreFocus: true,
      })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((url) => {
        if (!url?.trim()) return;
        const current = this.editor();
        if (!current || this.mode() !== 'article') return;
        const trimmed = url.trim();
        if (!/^https:\/\//i.test(trimmed)) return;
        current.chain().focus().setImage({ src: trimmed, alt: '' }).run();
      });
  }

  private createEditor(mode: PostContentEditorMode, placeholder: string): Editor {
    const isArticle = mode === 'article';

    const ed = new Editor({
      extensions: [
        StarterKit.configure({
          heading: isArticle ? { levels: [2, 3] } : false,
          blockquote: isArticle ? {} : false,
          horizontalRule: isArticle ? {} : false,
          code: false,
          codeBlock: false,
          strike: false,
        }),
        Underline,
        Link.configure({
          openOnClick: false,
          autolink: true,
          defaultProtocol: 'https',
          protocols: ['http', 'https'],
          HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
          isAllowedUri: (url, ctx) =>
            ctx.defaultValidate(url) && isSafeHref(url),
        }),
        Placeholder.configure({ placeholder }),
        ...(isArticle
          ? [
              Image.configure({
                allowBase64: false,
                HTMLAttributes: { loading: 'lazy' },
              }),
            ]
          : []),
      ],
      content: this.lastHtml || '',
      editorProps: {
        attributes: {
          class: 'post-content-editor__prose',
          'aria-label': this.ariaLabel(),
          role: 'textbox',
          'aria-multiline': 'true',
        },
      },
      onUpdate: ({ editor }) => {
        if (this.writing) return;
        const html = editor.getHTML();
        this.lastHtml = html;
        this.onChange(html);
        this.plainTextChange.emit(editor.getText().replace(/\s+/g, ' ').trim());
        this.syncActive(editor);
      },
      onSelectionUpdate: ({ editor }) => this.syncActive(editor),
      onBlur: () => this.onTouched(),
    });

    this.syncActive(ed);
    return ed;
  }

  private syncActive(editor: Editor): void {
    this.active.set({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      underline: editor.isActive('underline'),
      bulletList: editor.isActive('bulletList'),
      orderedList: editor.isActive('orderedList'),
      link: editor.isActive('link'),
      heading2: editor.isActive('heading', { level: 2 }),
      heading3: editor.isActive('heading', { level: 3 }),
      blockquote: editor.isActive('blockquote'),
    });
  }

  private destroyEditor(): void {
    const ed = this.editor();
    if (ed) {
      ed.destroy();
      this.editor.set(null);
    }
  }
}

function isSafeHref(href: string): boolean {
  const trimmed = href.trim();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('/')
  );
}

function normalizeEditorHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed || trimmed === '<p></p>' || trimmed === '<p><br></p>') return '';
  return trimmed;
}
