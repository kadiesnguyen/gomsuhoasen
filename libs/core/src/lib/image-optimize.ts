import { stat, unlink } from 'node:fs/promises';
import { dirname, extname, join } from 'node:path';
import type { MulterFile } from '@vt/nest-core';

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 80;

const RASTER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function loadSharp(): ((input: string) => {
  rotate: () => {
    resize: (opts: object) => {
      webp: (opts: object) => { toFile: (path: string) => Promise<unknown> };
    };
  };
}) | null {
  try {
    // ponytail: sharp is native; require at runtime so webpack doesn't break binaries
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('sharp') as ReturnType<typeof loadSharp>;
  } catch {
    return null;
  }
}

export async function optimizeUploadedImage(file: MulterFile): Promise<void> {
  const ext = extname(file.originalname || file.filename).toLowerCase();
  if (!RASTER_EXTENSIONS.has(ext)) return;
  // Already WebP — leave as-is (import script / clients often pre-convert)
  if (ext === '.webp') return;

  const sharp = loadSharp();
  if (!sharp) return;

  const inputPath = file.path;
  const baseName = file.filename.replace(/\.[^.]+$/i, '');
  const outputFilename = `${baseName}.webp`;
  const outputPath = join(dirname(inputPath), outputFilename);

  try {
    await sharp(inputPath)
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: WEBP_QUALITY })
      .toFile(outputPath);
  } catch {
    // Keep original upload if conversion fails
    return;
  }

  if (outputPath !== inputPath) {
    await unlink(inputPath).catch(() => undefined);
  }

  const outputStat = await stat(outputPath);
  file.filename = outputFilename;
  file.path = outputPath;
  file.mimetype = 'image/webp';
  file.size = outputStat.size;
  if (file.originalname) {
    file.originalname = file.originalname.replace(/\.[^.]+$/i, '.webp');
  }
}
