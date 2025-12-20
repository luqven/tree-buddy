import { nativeImage, NativeImage } from 'electron';

interface RGB {
  r: number;
  g: number;
  b: number;
}

// Apple system colors
const COLORS: Record<string, RGB> = {
  green: { r: 52, g: 199, b: 89 },
  yellow: { r: 255, g: 204, b: 0 },
  red: { r: 255, g: 59, b: 48 },
};

/**
 * Create a colored circle icon with subtle anti-aliasing
 */
function createCircle(color: RGB, size: number): NativeImage {
  const buf = Buffer.alloc(size * size * 4);
  const center = size / 2;
  const radius = size / 2 - 1.5;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - center + 0.5) ** 2 + (y - center + 0.5) ** 2);
      const idx = (y * size + x) * 4;

      if (dist <= radius) {
        // Fully inside - BGRA format for macOS
        buf[idx] = color.b;
        buf[idx + 1] = color.g;
        buf[idx + 2] = color.r;
        buf[idx + 3] = 255;
      } else if (dist <= radius + 1) {
        // Edge - subtle anti-alias
        const alpha = Math.round(255 * (radius + 1 - dist));
        buf[idx] = color.b;
        buf[idx + 1] = color.g;
        buf[idx + 2] = color.r;
        buf[idx + 3] = Math.max(0, Math.min(255, alpha));
      }
    }
  }

  return nativeImage.createFromBuffer(buf, { width: size, height: size });
}

// Generate at 16x16, resize to 12x12 for display
const SRC = 16;
const DST = 12;

/**
 * Pre-generated status icons
 */
export const statusIcons = {
  green: createCircle(COLORS.green, SRC).resize({ width: DST, height: DST }),
  yellow: createCircle(COLORS.yellow, SRC).resize({ width: DST, height: DST }),
  red: createCircle(COLORS.red, SRC).resize({ width: DST, height: DST }),
};
