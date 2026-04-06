import { Pipe, PipeTransform } from '@angular/core';
import { decodeHtmlEntities } from '../utils/decode-html-entities';

@Pipe({
  name: 'decodeHtmlEntities',
  standalone: true,
})
export class DecodeHtmlEntitiesPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (value == null || value === '') return value ?? '';
    return decodeHtmlEntities(value);
  }
}
