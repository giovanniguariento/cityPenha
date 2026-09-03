import { inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';
import { plainTextFromHtml } from '../utils/decode-html-entities';
import { SITE_URL } from '../constants/site-url';

const SITE_NAME = 'CityPenha Digital';
const BASE_URL = SITE_URL;
const DEFAULT_TITLE =
  'CityPenha Digital - Conteúdo, Conexão e Interatividade Gamificada';
const DEFAULT_DESCRIPTION =
  'Mais que informação, um espaço vivo de interação, conhecimento e benefícios. Explore conteúdos, conecte-se com a região e ganhe recompensas participando!';
const DEFAULT_IMAGE = `${BASE_URL}/assets/og-default.jpg`;
const JSON_LD_ID = 'structured-data';
const OG_IMAGE_WIDTH = '1200';
const OG_IMAGE_HEIGHT = '630';
const OG_IMAGE_TYPE = 'image/jpeg';
/** WordPress `large` size — keeps OG images under WhatsApp's ~600 KB limit. */
const WP_OG_SIZE_SUFFIX = '-1024x576';
const WP_UPLOADS_PATH = '/wp-content/uploads/';
const WP_SIZE_SUFFIX_PATTERN = /-(\d+)x(\d+)(\.(jpe?g|png|webp|gif))$/i;
/** WordPress publishes site-local timestamps with no offset; América/São_Paulo has no DST. */
const SITE_UTC_OFFSET = '-03:00';
const TIMEZONE_SUFFIX_PATTERN = /(Z|[+-]\d{2}:?\d{2})$/;

/** Player of a watch page — presence switches the page's schema to VideoObject. */
export interface ArticleVideoSeoConfig {
  contentUrl?: string;
  embedUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

export interface ArticleSeoConfig {
  title: string;
  description: string;
  image: string;
  url: string;
  publishedAt?: string;
  authorName?: string;
  category?: string;
  video?: ArticleVideoSeoConfig;
}

export interface PageSeoConfig {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: 'website' | 'article';
  /** When true, sets robots noindex,nofollow (auth/search/thin pages). */
  noindex?: boolean;
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
    const description = this.truncate(plainTextFromHtml(config.description));
    const isWatchPage = Boolean(config.video);
    const videoThumbnail = isWatchPage
      ? this.toAbsoluteUrl(config.video!.thumbnailUrl || config.image)
      : undefined;
    const image = isWatchPage
      ? videoThumbnail!
      : this.buildDynamicOgImageUrl({
          title: config.title,
          description: config.description,
          image: config.image,
          date: config.publishedAt,
        });

    this.titleService.setTitle(`${config.title} | ${SITE_NAME}`);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });

    // Open Graph
    this.meta.updateTag({ property: 'og:type', content: isWatchPage ? 'video.other' : 'article' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: config.url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.setOgImageMeta(image);
    this.meta.updateTag({ property: 'og:locale', content: 'pt_BR' });

    if (isWatchPage) {
      this.removeArticleTags();
      this.setWatchPageVideoTags(config.video!);
    } else {
      this.removeWatchPageVideoTags();
      if (config.publishedAt) {
        this.meta.updateTag({ property: 'article:published_time', content: config.publishedAt });
      }
      if (config.authorName) {
        this.meta.updateTag({ property: 'article:author', content: config.authorName });
      }
      if (config.category) {
        this.meta.updateTag({ property: 'article:section', content: config.category });
      }
    }

    // Twitter / X Card
    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(config.url);

    // JSON-LD — a single-video post must declare VideoObject; describing it as an
    // Article makes Google treat the video as supplementary and skip indexing it
    // ("video isn't on a watch page").
    this.setJsonLd(
      isWatchPage
        ? this.buildVideoObjectSchema(config, description, videoThumbnail!)
        : this.buildArticleSchema(config, description, image)
    );
  }

  private buildArticleSchema(
    config: ArticleSeoConfig,
    description: string,
    image: string
  ): object {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: config.title,
      description,
      image: [image],
      ...(config.publishedAt ? { datePublished: config.publishedAt } : {}),
      author: config.authorName
        ? [{ '@type': 'Person', name: config.authorName }]
        : [{ '@type': 'Organization', name: SITE_NAME }],
      publisher: this.publisherSchema(),
      url: config.url,
      mainEntityOfPage: config.url,
    };
  }

  private buildVideoObjectSchema(
    config: ArticleSeoConfig,
    description: string,
    videoThumbnail: string
  ): object {
    const video = config.video!;
    return {
      '@context': 'https://schema.org',
      '@type': 'VideoObject',
      name: config.title,
      description,
      thumbnailUrl: [videoThumbnail],
      ...(config.publishedAt
        ? { uploadDate: this.withTimezone(config.publishedAt) }
        : {}),
      ...(video.contentUrl ? { contentUrl: this.toAbsoluteUrl(video.contentUrl) } : {}),
      ...(video.embedUrl ? { embedUrl: this.toAbsoluteUrl(video.embedUrl) } : {}),
      ...(video.width ? { width: video.width } : {}),
      ...(video.height ? { height: video.height } : {}),
      inLanguage: 'pt-BR',
      publisher: this.publisherSchema(),
      url: config.url,
      mainEntityOfPage: config.url,
    };
  }

  private setWatchPageVideoTags(video: ArticleVideoSeoConfig): void {
    const videoUrl = video.contentUrl || video.embedUrl;
    if (!videoUrl) return;

    const absoluteVideoUrl = this.toAbsoluteUrl(videoUrl);
    this.meta.updateTag({ property: 'og:video', content: absoluteVideoUrl });
    this.meta.updateTag({ property: 'og:video:secure_url', content: absoluteVideoUrl });
    this.meta.updateTag({ property: 'og:video:type', content: video.contentUrl ? 'video/mp4' : 'text/html' });
    if (video.width) {
      this.meta.updateTag({ property: 'og:video:width', content: String(video.width) });
    }
    if (video.height) {
      this.meta.updateTag({ property: 'og:video:height', content: String(video.height) });
    }
  }

  private publisherSchema(): object {
    return {
      '@type': 'Organization',
      name: SITE_NAME,
      url: BASE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/assets/logo.png`,
      },
    };
  }

  private withTimezone(date: string): string {
    return TIMEZONE_SUFFIX_PATTERN.test(date) ? date : `${date}${SITE_UTC_OFFSET}`;
  }

  /**
   * Sets generic page metadata (home, discovery, missions, etc.).
   * Resets article-specific OG/Twitter tags and removes JSON-LD.
   */
  setPage(config: PageSeoConfig): void {
    const description = this.truncate(plainTextFromHtml(config.description));
    const image = this.buildDynamicOgImageUrl({
      title: config.title,
      description: config.description,
      image: config.image,
    });
    const url = config.url ?? BASE_URL;
    const type = config.type ?? 'website';

    const documentTitle =
      config.title === SITE_NAME || config.title === DEFAULT_TITLE
        ? DEFAULT_TITLE
        : `${config.title} | ${SITE_NAME}`;
    const ogTitle =
      config.title === SITE_NAME || config.title === DEFAULT_TITLE
        ? DEFAULT_TITLE
        : config.title;

    this.titleService.setTitle(documentTitle);
    this.meta.updateTag({ name: 'description', content: description });

    this.meta.updateTag({ property: 'og:type', content: type });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: ogTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: image });
    this.setOgImageMeta(image);
    this.meta.updateTag({ property: 'og:locale', content: 'pt_BR' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: ogTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: image });

    this.setCanonical(url);
    this.removeArticleTags();
    this.removeJsonLd();

    if (config.noindex) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    } else {
      this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    }
  }

  /** Convenience for auth / private / thin pages that must not be indexed. */
  setNoIndexPage(config: Omit<PageSeoConfig, 'noindex'>): void {
    this.setPage({ ...config, noindex: true });
  }

  /**
   * Injects Organization + WebSite JSON-LD for the homepage. This is the
   * primary signal Google uses to render the "site name" (next to the favicon)
   * in search results. Call after setPage() since setPage() clears JSON-LD.
   */
  setHomeStructuredData(): void {
    this.setJsonLd({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          name: SITE_NAME,
          url: BASE_URL,
          description: DEFAULT_DESCRIPTION,
          foundingDate: '2006',
          logo: {
            '@type': 'ImageObject',
            url: `${BASE_URL}/assets/logo.png`,
          },
        },
        {
          '@type': 'WebSite',
          name: SITE_NAME,
          url: BASE_URL,
          inLanguage: 'pt-BR',
        },
      ],
    });
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
    this.titleService.setTitle(DEFAULT_TITLE);
    this.meta.updateTag({ name: 'description', content: DEFAULT_DESCRIPTION });
    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: DEFAULT_TITLE });
    this.meta.updateTag({ property: 'og:description', content: DEFAULT_DESCRIPTION });
    this.meta.updateTag({ property: 'og:url', content: BASE_URL });
    this.meta.updateTag({ property: 'og:image', content: DEFAULT_IMAGE });
    this.setOgImageMeta(DEFAULT_IMAGE);
    this.meta.updateTag({ property: 'og:locale', content: 'pt_BR' });
    this.meta.removeTag('name="twitter:card"');
    this.meta.removeTag('name="twitter:title"');
    this.meta.removeTag('name="twitter:description"');
    this.meta.removeTag('name="twitter:image"');
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.removeArticleTags();
    this.removeWatchPageVideoTags();
    this.setCanonical(BASE_URL);
    this.removeJsonLd();
  }

  private removeArticleTags(): void {
    this.meta.removeTag('property="article:published_time"');
    this.meta.removeTag('property="article:author"');
    this.meta.removeTag('property="article:section"');
  }

  private removeWatchPageVideoTags(): void {
    this.meta.removeTag('property="og:video"');
    this.meta.removeTag('property="og:video:secure_url"');
    this.meta.removeTag('property="og:video:type"');
    this.meta.removeTag('property="og:video:width"');
    this.meta.removeTag('property="og:video:height"');
  }

  private removeJsonLd(): void {
    this.doc.getElementById(JSON_LD_ID)?.remove();
  }

  private truncate(text: string, maxLength = 160): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  /**
   * Builds the URL for the backend's branded OG image template, shared by
   * articles and generic pages. `imageUrl` (background photo) and `date` are
   * omitted when absent — pages render on the template's dark gradient without
   * a date, matching the news layout with only the text changed.
   */
  private buildDynamicOgImageUrl(config: {
    title: string;
    description: string;
    image?: string;
    date?: string;
  }): string {
    const apiBase = environment.apiUrl.replace(/\/$/, '');
    const params = new URLSearchParams({
      title: config.title,
      description: plainTextFromHtml(config.description).slice(0, 160),
    });
    if (config.image) {
      params.set('imageUrl', this.toOgImageUrl(config.image));
    }
    if (config.date) {
      params.set('date', config.date);
    }
    return `${apiBase}/og-image?${params.toString()}`;
  }

  private setOgImageMeta(imageUrl: string): void {
    this.meta.updateTag({ property: 'og:image:width', content: OG_IMAGE_WIDTH });
    this.meta.updateTag({ property: 'og:image:height', content: OG_IMAGE_HEIGHT });
    this.meta.updateTag({ property: 'og:image:type', content: this.inferImageMimeType(imageUrl) });
  }

  private inferImageMimeType(url: string): string {
    const normalized = url.split('?')[0].toLowerCase();
    if (normalized.endsWith('.png')) return 'image/png';
    if (normalized.endsWith('.webp')) return 'image/webp';
    if (normalized.endsWith('.gif')) return 'image/gif';
    return OG_IMAGE_TYPE;
  }

  /**
   * Resolves an OG image URL optimized for WhatsApp (< 600 KB).
   * WordPress uploads are rewritten to the `large` variant (~1024 px wide).
   */
  private toOgImageUrl(rawUrl: string): string {
    const absolute = this.toAbsoluteUrl(rawUrl);
    if (!absolute.includes(WP_UPLOADS_PATH)) return absolute;

    const [path, query = ''] = absolute.split('?');
    const sized = this.toWordPressLargeImagePath(path);
    return query ? `${sized}?${query}` : sized;
  }

  private toWordPressLargeImagePath(path: string): string {
    const match = path.match(WP_SIZE_SUFFIX_PATTERN);
    if (!match) return path;

    const width = Number(match[1]);
    if (width <= 1200) return path;

    return path.replace(WP_SIZE_SUFFIX_PATTERN, `${WP_OG_SIZE_SUFFIX}${match[3]}`);
  }

  private toAbsoluteUrl(url: string): string {
    if (!url) return DEFAULT_IMAGE;
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }
}
