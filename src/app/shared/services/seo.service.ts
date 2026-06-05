import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';

const SITE_NAME = 'CityPenha';
const BASE_URL = 'https://citypenha.com.br';
const DEFAULT_DESCRIPTION = 'As últimas notícias de Penha e região.';
const DEFAULT_IMAGE = `${BASE_URL}/assets/og-default.jpg`;
const JSON_LD_ID = 'structured-data';

export interface ArticleSeoConfig {
  title: string;
  description: string;
  image: string;
  url: string;
  publishedAt?: string;
  authorName?: string;
  category?: string;
}

export interface PageSeoConfig {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: 'website' | 'article';
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly titleService = inject(Title);
  private readonly meta = inject(Meta);
  private readonly doc = inject(DOCUMENT);

  /**
   * Sets all head metadata for a news article: title, description, Open Graph
   * article tags, Twitter Card, canonical link, and JSON-LD NewsArticle schema.
   * Uses updateTag (not addTag) so SPA navigation between articles stays clean.
   */
  setArticle(config: ArticleSeoConfig): void {
    const description = this.truncate(config.description);
    const image = this.toAbsoluteUrl(config.image);

    this.titleService.setTitle(`${config.title} | ${SITE_NAME}`);
    this.meta.updateTag({ name: 'description', content: description });

    // Open Graph
    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: config.url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:locale', content: 'pt_BR' });

    if (config.publishedAt) {
      this.meta.updateTag({ property: 'article:published_time', content: config.publishedAt });
    }
    if (config.authorName) {
      this.meta.updateTag({ property: 'article:author', content: config.authorName });
    }
    if (config.category) {
      this.meta.updateTag({ property: 'article:section', content: config.category });
    }

    // Twitter / X Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(config.url);

    // JSON-LD — NewsArticle structured data (helps Google News indexing)
    this.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: config.title,
      description,
      image: [image],
      ...(config.publishedAt ? { datePublished: config.publishedAt } : {}),
      author: config.authorName
        ? [{ '@type': 'Person', name: config.authorName }]
        : [{ '@type': 'Organization', name: SITE_NAME }],
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        url: BASE_URL,
      },
      url: config.url,
      mainEntityOfPage: config.url,
    });
  }

  /**
   * Sets generic page metadata (home, discovery, missions, etc.).
   * Resets article-specific OG/Twitter tags and removes JSON-LD.
   */
  setPage(config: PageSeoConfig): void {
    const description = this.truncate(config.description);
    const image = config.image ? this.toAbsoluteUrl(config.image) : DEFAULT_IMAGE;
    const url = config.url ?? BASE_URL;
    const type = config.type ?? 'website';

    this.titleService.setTitle(`${config.title} | ${SITE_NAME}`);
    this.meta.updateTag({ name: 'description', content: description });

    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.meta.updateTag({ property: 'og:locale', content: 'pt_BR' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(url);
    this.removeArticleTags();
    this.removeJsonLd();
  }

  setCanonical(url: string): void {
    let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.doc.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.doc.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  setJsonLd(schema: object): void {
    this.removeJsonLd();
    const script = this.doc.createElement('script');
    script.type = 'application/ld+json';
    script.id = JSON_LD_ID;
    script.textContent = JSON.stringify(schema);
    this.doc.head.appendChild(script);
  }

  /** Resets head to portal defaults — call in ngOnDestroy of article pages. */
  resetToDefault(): void {
    this.titleService.setTitle(SITE_NAME);
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:description', content: DEFAULT_DESCRIPTION });
    this.meta.updateTag({ property: 'og:url', content: BASE_URL });
    this.meta.updateTag({ property: 'og:image', content: DEFAULT_IMAGE });
    this.meta.updateTag({ property: 'og:locale', content: 'pt_BR' });
    this.meta.removeTag('name="twitter:card"');
    this.meta.removeTag('name="twitter:title"');
    this.meta.removeTag('name="twitter:description"');
    this.meta.removeTag('name="twitter:image"');
    this.removeArticleTags();
    this.setCanonical(BASE_URL);
    this.removeJsonLd();
  }

  private removeArticleTags(): void {
    this.meta.removeTag('property="article:published_time"');
    this.meta.removeTag('property="article:author"');
    this.meta.removeTag('property="article:section"');
  }

  private removeJsonLd(): void {
    this.doc.getElementById(JSON_LD_ID)?.remove();
  }

  private truncate(text: string, maxLength = 160): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  private toAbsoluteUrl(url: string): string {
    if (!url) return DEFAULT_IMAGE;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
