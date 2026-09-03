import type { PostVideo } from '../interface/home.interface';

/** YouTube thumbnail size guaranteed to exist for every public video. */
const YOUTUBE_THUMBNAIL_SIZE = 'hqdefault';
const YOUTUBE_ID_PATTERN =
  /(?:youtube(?:-nocookie)?\.com\/(?:embed|shorts|v)\/|youtu\.be\/)([A-Za-z0-9_-]{11})/;

/**
 * Reads player metadata from WordPress HTML so watch pages can emit VideoObject
 * even when the API response omits the `video` field.
 */
export function extractPostVideoFromHtml(
  htmlContent: string,
  fallbackThumbnailUrl?: string
): PostVideo | undefined {
  if (!htmlContent) return undefined;

  const videoSrcMatch = htmlContent.match(/<video[^>]*\ssrc=["']([^"']+)["']/i);
  if (videoSrcMatch?.[1]) {
    const posterMatch = htmlContent.match(/<video[^>]*\sposter=["']([^"']+)["']/i);
    const widthMatch = htmlContent.match(/<video[^>]*\swidth=["'](\d+)["']/i);
    const heightMatch = htmlContent.match(/<video[^>]*\sheight=["'](\d+)["']/i);
    return omitEmpty({
      contentUrl: videoSrcMatch[1].trim(),
      thumbnailUrl: posterMatch?.[1]?.trim() || fallbackThumbnailUrl,
      width: toPositiveInt(widthMatch?.[1]),
      height: toPositiveInt(heightMatch?.[1]),
    });
  }

  const iframeMatch = htmlContent.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (!iframeMatch?.[1]) return undefined;

  const embedUrl = iframeMatch[1].trim();
  const widthMatch = htmlContent.match(/<iframe[^>]*\swidth=["'](\d+)["']/i);
  const heightMatch = htmlContent.match(/<iframe[^>]*\sheight=["'](\d+)["']/i);
  return omitEmpty({
    embedUrl,
    thumbnailUrl: youtubeThumbnailUrl(embedUrl) ?? fallbackThumbnailUrl,
    width: toPositiveInt(widthMatch?.[1]),
    height: toPositiveInt(heightMatch?.[1]),
  });
}

/**
 * Makes watch-page markup crawl-friendly: poster on self-hosted video and no lazy
 * loading on the primary player.
 */
export function prepareWatchPageMediaHtml(htmlContent: string, thumbnailUrl?: string): string {
  if (!htmlContent) return htmlContent;

  let html = htmlContent.replace(/\sloading=(["'])lazy\1/gi, '');

  if (thumbnailUrl && !/\sposter=(["']).*?\1/i.test(html)) {
    html = html.replace(/<video\b/i, `<video poster="${escapeAttr(thumbnailUrl)}"`);
  }

  if (!/\spreload=(["']).*?\1/i.test(html)) {
    html = html.replace(/<video\b/i, '<video preload="metadata"');
  }

  return html;
}

function youtubeThumbnailUrl(embedUrl: string): string | undefined {
  const videoId = embedUrl.match(YOUTUBE_ID_PATTERN)?.[1];
  return videoId ? `https://i.ytimg.com/vi/${videoId}/${YOUTUBE_THUMBNAIL_SIZE}.jpg` : undefined;
}

function toPositiveInt(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : undefined;
}

function omitEmpty(video: PostVideo): PostVideo | undefined {
  const entries = Object.entries(video).filter(([, value]) => value != null && value !== '');
  return entries.length > 0 ? (Object.fromEntries(entries) as PostVideo) : undefined;
}

function escapeAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
