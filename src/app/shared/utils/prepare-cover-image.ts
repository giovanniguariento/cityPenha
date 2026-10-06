/** Max long-edge for article cover before JPEG encode. */
const MAX_EDGE = 1600;

/** Backend thumbnail limit (JPEG/PNG/WebP). */
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Loads, downscales and JPEG-encodes a local image File for article cover upload.
 * Returns null if the browser cannot decode/draw the image or size stays over limit.
 */
export async function prepareCoverImage(file: File): Promise<Blob | null> {
  const source = await loadImageSource(file);
  if (!source) return null;

  const { width: srcW, height: srcH } = source;
  if (!srcW || !srcH) {
    source.close();
    return null;
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
      return null;
    }
    ctx.drawImage(source.drawable, 0, 0, width, height);
    source.close();

    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      const blob = await canvasToJpeg(canvas, quality);
      if (blob && blob.size <= MAX_BYTES) return blob;
    }
    return null;
  } catch {
    source.close();
    return null;
  }
}

interface ImageSource {
  drawable: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

async function loadImageSource(file: File): Promise<ImageSource | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        drawable: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        close: () => bitmap.close(),
      };
    } catch {
      // Fall through to <img> path (e.g. some HEIC browsers).
    }
  }

  return loadViaImgElement(file);
}

function loadViaImgElement(file: File): Promise<ImageSource | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = 'async';

    const finish = (source: ImageSource | null) => {
      URL.revokeObjectURL(objectUrl);
      resolve(source);
    };

    img.onload = () => {
      finish({
        drawable: img,
        width: img.naturalWidth,
        height: img.naturalHeight,
        close: () => undefined,
      });
    };
    img.onerror = () => finish(null);
    img.src = objectUrl;
  });
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}
