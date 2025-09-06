import { Injectable, BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Metadata } from 'sharp';

type SharpCallable = typeof import('sharp');

// Minimal Cloudinary v2 types used in this service (avoid 'any')
interface CloudinaryUploadOptions {
  folder?: string;
  public_id?: string;
  overwrite?: boolean;
  resource_type?: string;
}

interface CloudinaryUploadResult {
  secure_url?: string;
  url?: string;
}

interface CloudinaryV2 {
  config: (opts: {
    cloud_name?: string;
    api_key?: string;
    api_secret?: string;
    secure?: boolean;
  }) => void;
  uploader: {
    upload_stream: (
      options: CloudinaryUploadOptions,
      callback: (
        error: Error | null,
        result: CloudinaryUploadResult | undefined,
      ) => void,
    ) => NodeJS.WritableStream;
  };
}

@Injectable()
export class UploadService {
  private ensureDir(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // Determine if Cloudinary should be used for storage
  private useCloudinary(): boolean {
    const mode = (process.env.UPLOAD_STORAGE || 'local').toLowerCase();
    return (
      mode === 'cloudinary' &&
      !!process.env.CLOUDINARY_CLOUD_NAME &&
      !!process.env.CLOUDINARY_API_KEY &&
      !!process.env.CLOUDINARY_API_SECRET
    );
  }

  // Lazy configure Cloudinary SDK only when needed
  private async getCloudinary(): Promise<CloudinaryV2> {
    try {
      const mod: unknown = await import('cloudinary');
      const maybeV2 = mod as Partial<{ v2: CloudinaryV2 }> & CloudinaryV2;
      const cloudinary: CloudinaryV2 = maybeV2.v2 ?? (maybeV2 as CloudinaryV2);
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      return cloudinary;
    } catch {
      throw new Error(
        'Cloudinary module not installed. Please install "cloudinary" and redeploy.',
      );
    }
  }

  private cloudFolder(sub: string): string {
    const base = (process.env.CLOUDINARY_FOLDER || 'blogcms').replace(
      /\/+$/g,
      '',
    );
    return `${base}/${sub}`;
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
    const localPath = join(dest, filename);

    await this.assertValidImage(file);

    const sharp = await this.loadSharp();
    const jpegBuffer = await sharp(file.buffer)
      .rotate()
      .resize(1200, 630, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 80 })
      .toBuffer();

    if (this.useCloudinary()) {
      const cloudinary = await this.getCloudinary();
      const folder = this.cloudFolder('covers');
      const publicId = filename.replace(/\.jpg$/i, '');
      const result = await new Promise<CloudinaryUploadResult>(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              public_id: publicId,
              overwrite: true,
              resource_type: 'image',
            },
            (err, res) => {
              if (err)
                return reject(
                  err instanceof Error ? err : new Error(String(err)),
                );
              if (!res)
                return reject(
                  new Error('Cloudinary upload returned no result for cover'),
                );
              resolve(res);
            },
          );
          stream.end(jpegBuffer);
        },
      );
      const url = result.secure_url ?? result.url;
      if (!url)
        throw new Error('Cloudinary did not return a URL for cover upload');
      return { url };
    }

    // Local disk fallback
    await sharp(jpegBuffer).toFile(localPath);
    const url = `/uploads/covers/${filename}`;
    return { url };
  }

  async processImage(file: Express.Multer.File) {
    const root = 'uploads';
    const dest = join(root, 'images');
    this.ensureDir(dest);

    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `image-${unique}.jpg`;
    const localPath = join(dest, filename);

    await this.assertValidImage(file);

    // Normalize orientation, cap width, strip metadata and re-encode to JPEG
    const sharp = await this.loadSharp();
    const jpegBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();

    if (this.useCloudinary()) {
      const cloudinary = await this.getCloudinary();
      const folder = this.cloudFolder('images');
      const publicId = filename.replace(/\.jpg$/i, '');
      const result = await new Promise<CloudinaryUploadResult>(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              public_id: publicId,
              overwrite: true,
              resource_type: 'image',
            },
            (err, res) => {
              if (err)
                return reject(
                  err instanceof Error ? err : new Error(String(err)),
                );
              if (!res)
                return reject(
                  new Error('Cloudinary upload returned no result for image'),
                );
              resolve(res);
            },
          );
          stream.end(jpegBuffer);
        },
      );
      const url = result.secure_url ?? result.url;
      if (!url)
        throw new Error('Cloudinary did not return a URL for image upload');
      return { url };
    }

    // Local disk fallback
    await sharp(jpegBuffer).toFile(localPath);
    const url = `/uploads/images/${filename}`;
    return { url };
  }

  async processAvatar(file: Express.Multer.File) {
    const root = 'uploads';
    const dest = join(root, 'avatars');
    this.ensureDir(dest);

    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `avatar-${unique}.jpg`;
    const localPath = join(dest, filename);

    await this.assertValidImage(file);

    // Square crop to 256x256 using attention strategy
    const sharp = await this.loadSharp();
    const jpegBuffer = await sharp(file.buffer)
      .resize(256, 256, { fit: 'cover', position: sharp.strategy.attention })
      .jpeg({ quality: 85 })
      .toBuffer();

    if (this.useCloudinary()) {
      const cloudinary = await this.getCloudinary();
      const folder = this.cloudFolder('avatars');
      const publicId = filename.replace(/\.jpg$/i, '');
      const result = await new Promise<CloudinaryUploadResult>(
        (resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            {
              folder,
              public_id: publicId,
              overwrite: true,
              resource_type: 'image',
            },
            (err, res) => {
              if (err)
                return reject(
                  err instanceof Error ? err : new Error(String(err)),
                );
              if (!res)
                return reject(
                  new Error('Cloudinary upload returned no result for image'),
                );
              resolve(res);
            },
          );
          stream.end(jpegBuffer);
        },
      );
      const url = result.secure_url ?? result.url;
      if (!url)
        throw new Error('Cloudinary did not return a URL for avatar upload');
      return { url };
    }

    // Local disk fallback
    await sharp(jpegBuffer).toFile(localPath);
    const url = `/uploads/avatars/${filename}`;
    return { url };
  }
}
