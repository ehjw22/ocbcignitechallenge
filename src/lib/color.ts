export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const raw = hex.replace("#", "").trim();
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw.padEnd(6, "0").slice(0, 6);
  const n = Number.parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(a: string, b: string): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = hexToRgb(hex);
  const f = (n: number) => Math.max(0, Math.round(n * (1 - amount)));
  return `#${[f(r), f(g), f(b)]
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** Darken a chosen accent until white label text clears WCAG AA. */
export function ensureButtonContrast(hex: string): {
  bg: string;
  fg: string;
  adjusted: boolean;
} {
  let bg = hex.startsWith("#") ? hex : `#${hex}`;
  let adjusted = false;
  for (let i = 0; i < 14 && contrastRatio(bg, "#ffffff") < 4.5; i += 1) {
    bg = darken(bg, 0.1);
    adjusted = true;
  }
  if (contrastRatio(bg, "#ffffff") < 4.5) {
    return { bg: "#7a0010", fg: "#ffffff", adjusted: true };
  }
  return { bg, fg: "#ffffff", adjusted };
}

export async function fileToJpeg(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = dataUrl;
  });
  const max = 720;
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

/** Sample the image under a black overlay and pick an overlay that keeps white text at AA. */
export async function overlayForImage(
  dataUrl: string,
): Promise<{ overlay: number; warn: boolean }> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Could not read that image."));
    img.src = dataUrl;
  });
  const w = 32;
  const h = 32;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { overlay: 0.72, warn: true };
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const steps = [0.45, 0.58, 0.7, 0.82];
  let best = 0.82;
  for (const overlay of steps) {
    let lum = 0;
    const pixels = w * h;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] * (1 - overlay);
      const g = data[i + 1] * (1 - overlay);
      const b = data[i + 2] * (1 - overlay);
      lum += 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
    }
    lum /= pixels;
    const ratio = 1.05 / (lum + 0.05);
    best = overlay;
    if (ratio >= 4.5) return { overlay, warn: false };
  }
  return { overlay: best, warn: true };
}
