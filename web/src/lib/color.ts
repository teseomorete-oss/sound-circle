// Pull a vivid, representative colour out of an album cover so the UI can tint
// itself to the music. Deezer/iTunes covers send CORS headers, so we can read
// their pixels from a canvas.

const cache = new Map<string, [number, number, number]>();

function rgbToHsv(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const d = max - min;
  const v = max;
  const s = max === 0 ? 0 : d / max;
  return [s, v];
}

export function dominantColor(url: string): Promise<[number, number, number]> {
  if (cache.has(url)) return Promise.resolve(cache.get(url)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const size = 24;
        const c = document.createElement('canvas');
        c.width = size; c.height = size;
        const ctx = c.getContext('2d');
        if (!ctx) return reject(new Error('no ctx'));
        ctx.drawImage(img, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        let best: [number, number, number] = [120, 110, 140];
        let bestScore = -1;
        let ar = 0, ag = 0, ab = 0, n = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          ar += r; ag += g; ab += b; n++;
          const [s, v] = rgbToHsv(r, g, b);
          if (v < 0.15 || v > 0.96) continue;       // skip near-black / near-white
          const score = s * Math.sqrt(v);            // prefer saturated but not dark
          if (score > bestScore) { bestScore = score; best = [r, g, b]; }
        }
        // If the cover is basically grayscale, fall back to its average colour.
        if (bestScore < 0.12 && n) best = [Math.round(ar / n), Math.round(ag / n), Math.round(ab / n)];
        cache.set(url, best);
        resolve(best);
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = url;
  });
}
