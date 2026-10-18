export type Feature = number[];

const BINS = 4;

/** Color histogram (R,G,B × 4 bins) plus mean brightness. */
export function histogramFromPixels(
  pixels: Uint8ClampedArray | number[],
  stride = 4,
): Feature {
  const hist = new Array<number>(BINS * 3).fill(0);
  let n = 0;
  let bright = 0;
  const step = Math.max(stride, Math.floor(pixels.length / 12000) * stride);
  for (let i = 0; i + 2 < pixels.length; i += step) {
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    hist[Math.min(BINS - 1, (r / 256) * BINS)] += 1;
    hist[BINS + Math.min(BINS - 1, (g / 256) * BINS)] += 1;
    hist[BINS * 2 + Math.min(BINS - 1, (b / 256) * BINS)] += 1;
    bright += (r + g + b) / (3 * 255);
    n += 1;
  }
  const denom = n || 1;
  const norm = hist.map((v) => v / denom);
  norm.push(bright / denom);
  return norm;
}

export function histogramFromPalette(
  stops: { rgb: [number, number, number]; weight: number }[],
): Feature {
  const samples: number[] = [];
  for (const stop of stops) {
    const copies = Math.max(1, Math.round(stop.weight * 40));
    for (let i = 0; i < copies; i += 1) {
      samples.push(stop.rgb[0], stop.rgb[1], stop.rgb[2], 255);
    }
  }
  return histogramFromPixels(samples, 4);
}

export function cosine(a: Feature, b: Feature): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}

export async function featuresFromFile(file: File): Promise<Feature> {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const canvas = document.createElement("canvas");
    const size = 96;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size);
    return histogramFromPixels(data.data, 16);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read that image"));
    img.src = src;
  });
}
