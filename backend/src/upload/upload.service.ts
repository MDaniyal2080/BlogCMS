import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'sharp';

type SharpCallable = typeof import('sharp');

@Injectable()
export class UploadService {
  private ensureDir(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // Lazy-load sharp default export (callable) in a type-safe way
  // Works for both ESM and CommonJS environments.
  private async loadSharp(): Promise<SharpCallable> {
    const mod: unknown = await import('sharp');
    // ESM: module has a callable default export
    if (typeof mod === 'object' && mod !== null && 'default' in mod) {
      const def = (mod as { default: unknown }).default;
      if (typeof def === 'function') {
        return def as SharpCallable;
      }
    }
    // CJS: module itself is callable
    if (typeof mod === 'function') {
      return mod as SharpCallable;
    }
    throw new Error('Failed to load sharp module');
  }

  // Basic verification that the uploaded buffer is a valid image and within safe bounds
  private async assertValidImage(
    file: Express.Multer.File,
    opts?: { maxPixels?: number },
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Empty upload');
    }
    let meta: Metadata;
    try {
      const sharp = await this.loadSharp();
      meta = await sharp(file.buffer).metadata();
    } catch {
      throw new BadRequestException('Invalid or unsupported image');
    }
    const { width, height, format } = meta;
    if (!width || !height || !format) {
      throw new BadRequestException('Invalid or unsupported image');
    }
    const allowed = new Set(['jpeg', 'png', 'webp', 'gif', 'avif']);
    if (!allowed.has(format)) {
      throw new BadRequestException('Unsupported image format');
    }
    const maxPixels = Number(process.env.UPLOAD_MAX_PIXELS || 40_000_000); // 40MP default
    const limit = opts?.maxPixels ?? maxPixels;
    if (width * height > limit) {
      throw new BadRequestException('Image dimensions too large');
    }
  }

  async processCover(file: Express.Multer.File) {
    const root = 'uploads';
    const dest = join(root, 'covers');
    this.ensureDir(dest);

    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `cover-${unique}.jpg`;
    const outPath = join(dest, filename);

    await this.assertValidImage(file);

    const sharp = await this.loadSharp();
    await sharp(file.buffer)
      .rotate()
      .resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 80 })
      .toFile(outPath);

    const url = `/uploads/covers/${filename}`;
    return { url };
  }

  async processImage(file: Express.Multer.File) {
    const root = 'uploads';
    const dest = join(root, 'images');
    this.ensureDir(dest);

    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `image-${unique}.jpg`;
    const outPath = join(dest, filename);

    await this.assertValidImage(file);

    // Normalize orientation, cap width, strip metadata and re-encode to JPEG
    const sharp = await this.loadSharp();
    await sharp(file.buffer)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toFile(outPath);

    const url = `/uploads/images/${filename}`;
    return { url };
  }

  async processAvatar(file: Express.Multer.File) {
    const root = 'uploads';
    const dest = join(root, 'avatars');
    this.ensureDir(dest);

    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `avatar-${unique}.jpg`;
    const outPath = join(dest, filename);

    await this.assertValidImage(file);

    // Square crop to 256x256 using attention strategy
    const sharp = await this.loadSharp();
    await sharp(file.buffer)
      .resize(256, 256, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 85 })
      .toFile(outPath);

    const url = `/uploads/avatars/${filename}`;
    return { url };
  }
}
