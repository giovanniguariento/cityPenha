export interface ImageSource {
  drawable: CanvasImageSource;
  width: number;
  height: number;
  close: () => void;
}

/** Decode a local image File via createImageBitmap, with img-element fallback. */
export async function loadImageSource(file: File): Promise<ImageSource | null> {
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

export function canvasToJpeg(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}
