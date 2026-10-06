/**
 * Captures a JPEG poster frame from a local video File (blob URL).
 * Seeks ~0.5s in to avoid a black first frame when possible.
 * Returns null if the browser cannot decode/draw the video.
 */
export function captureVideoPoster(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';
    video.src = objectUrl;

    let settled = false;
    const finish = (blob: Blob | null) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(objectUrl);
      resolve(blob);
    };

    const drawFrame = () => {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) {
        finish(null);
        return;
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }
        ctx.drawImage(video, 0, 0, width, height);
        canvas.toBlob((blob) => finish(blob), 'image/jpeg', 0.85);
      } catch {
        finish(null);
      }
    };

    video.addEventListener('error', () => finish(null));
    video.addEventListener('loadeddata', () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const seekTo = duration > 0 ? Math.min(0.5, duration * 0.1) : 0;

      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        drawFrame();
      };
      video.addEventListener('seeked', onSeeked);

      try {
        video.currentTime = seekTo;
      } catch {
        video.removeEventListener('seeked', onSeeked);
        drawFrame();
      }

      // Some browsers never fire seeked when currentTime is already ~0.
      window.setTimeout(() => {
        if (!settled) drawFrame();
      }, 1200);
    });
  });
}
