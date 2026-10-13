import { canvasToJpeg, loadImageSource } from './load-image-source';

/** Max long-edge for profile avatar before JPEG encode (backend crops to 512). */
const MAX_EDGE = 1024;

/** Backend avatar upload limit after client prepare. */
const MAX_BYTES = 2 * 1024 * 1024;

export type PrepareAvatarResult =
  | { ok: true; blob: Blob }
  | { ok: false; reason: 'decode' | 'too_large' };

/**
 * Loads, downscales and JPEG-encodes a local image File for avatar upload.
 */
export async function prepareAvatarImage(file: File): Promise<PrepareAvatarResult> {
  const source = await loadImageSource(file);
  if (!source) return { ok: false, reason: 'decode' };

  const { width: srcW, height: srcH } = source;
  if (!srcW || !srcH) {
    source.close();
    return { ok: false, reason: 'decode' };
  }

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));

  try {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      source.close();
      return { ok: false, reason: 'decode' };
    }
    ctx.drawImage(source.drawable, 0, 0, width, height);
    source.close();

    let lastBlob: Blob | null = null;
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await canvasToJpeg(canvas, quality);
      if (!blob) continue;
      lastBlob = blob;
      if (blob.size <= MAX_BYTES) return { ok: true, blob };
    }

    if (lastBlob && lastBlob.size > MAX_BYTES) {
      return { ok: false, reason: 'too_large' };
    }
    return { ok: false, reason: 'decode' };
  } catch {
    source.close();
    return { ok: false, reason: 'decode' };
  }
}
