/** Aligned with backend `SHORT_VIDEO_MAX_BYTES` / Nginx `client_max_body_size` (Cloudflare Free/Pro cap). */
export const SHORT_VIDEO_MAX_BYTES = 100 * 1024 * 1024;

/** Aligned with backend `shortThumbnailMaxBytes` for article inline images. */
export const ARTICLE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
