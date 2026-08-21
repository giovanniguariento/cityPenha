import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

const MIN_TERM_LENGTH = 2;

/** Grupos de letras que devem casar independentemente do acento. */
const ACCENT_GROUPS = [
  'aàáâãäå',
  'eèéêë',
  'iìíîï',
  'oòóôõö',
  'uùúûü',
  'cç',
  'nñ',
];

const VARIANTS_BY_CHAR = new Map<string, string>();
for (const group of ACCENT_GROUPS) {
  for (const char of group) {
    VARIANTS_BY_CHAR.set(char, group);
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Monta um padrão que casa o termo ignorando acentos e maiúsculas/minúsculas. */
function buildTermPattern(term: string): string {
  let pattern = '';
  for (const char of term) {
    const lower = char.toLowerCase();
    const variants = VARIANTS_BY_CHAR.get(lower);
    if (variants) {
      pattern += `[${variants}]`;
    } else {
      pattern += escapeRegExp(char);
    }
  }
  return pattern;
}

@Pipe({
  name: 'highlightTerm',
  standalone: true,
})
export class HighlightTermPipe implements PipeTransform {
  private readonly sanitizer = inject(DomSanitizer);

  transform(text: string | null | undefined, term: string | null | undefined): SafeHtml {
    const safeText = escapeHtml(text ?? '');
    const trimmedTerm = (term ?? '').trim();
    if (trimmedTerm.length < MIN_TERM_LENGTH) {
      return this.sanitizer.bypassSecurityTrustHtml(safeText);
    }

    const pattern = buildTermPattern(trimmedTerm);
    if (!pattern) {
      return this.sanitizer.bypassSecurityTrustHtml(safeText);
    }

    const regex = new RegExp(pattern, 'gi');
    const highlighted = safeText.replace(
      regex,
      (match) => `<mark class="dsearch__mark">${match}</mark>`
    );
    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}
