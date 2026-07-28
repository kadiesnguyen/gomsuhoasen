import { describe, expect, it } from 'vitest';
import { extname } from 'node:path';

const RASTER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function shouldOptimize(originalName: string): boolean {
  const ext = extname(originalName).toLowerCase();
  if (!RASTER_EXTENSIONS.has(ext)) return false;
  if (ext === '.webp') return false;
  return true;
}

describe('image optimize gate', () => {
  it('skips non-raster uploads', () => {
    expect(shouldOptimize('model.glb')).toBe(false);
  });

  it('optimizes jpeg uploads', () => {
    expect(shouldOptimize('photo.JPG')).toBe(true);
  });

  it('skips webp uploads', () => {
    expect(shouldOptimize('thumb.webp')).toBe(false);
  });
});
