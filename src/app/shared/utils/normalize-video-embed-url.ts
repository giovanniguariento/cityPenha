/** YouTube watch / shorts / youtu.be → embed URL. */
const YOUTUBE_WATCH =
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([A-Za-z0-9_-]{11})/i;
const YOUTUBE_SHORTS =
  /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/i;
const YOUTUBE_EMBED =
  /(?:https?:\/\/)?(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([A-Za-z0-9_-]{11})/i;
const YOUTU_BE = /(?:https?:\/\/)?youtu\.be\/([A-Za-z0-9_-]{11})/i;

const VIMEO_PAGE = /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(?:video\/)?(\d+)/i;
const VIMEO_PLAYER = /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/i;

export type NormalizedVideoUrl =
  | { kind: 'embed'; src: string }
  | { kind: 'file'; src: string };

/**
 * Normalizes a pasted video URL into either a YouTube/Vimeo embed src
 * or a direct https file URL. Returns null when invalid.
 */
export function normalizeVideoEmbedUrl(raw: string): NormalizedVideoUrl | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const youtubeId =
    trimmed.match(YOUTUBE_EMBED)?.[1] ||
    trimmed.match(YOUTUBE_WATCH)?.[1] ||
    trimmed.match(YOUTUBE_SHORTS)?.[1] ||
    trimmed.match(YOUTU_BE)?.[1];
  if (youtubeId) {
    return { kind: 'embed', src: `https://www.youtube.com/embed/${youtubeId}` };
  }

  const vimeoId = trimmed.match(VIMEO_PLAYER)?.[1] || trimmed.match(VIMEO_PAGE)?.[1];
  if (vimeoId) {
    return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeoId}` };
  }

  if (!/^https:\/\//i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return null;
    // Direct media file or CDN URL without a known embed host.
    return { kind: 'file', src: trimmed };
  } catch {
    return null;
  }
}
