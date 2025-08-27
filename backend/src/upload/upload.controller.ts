import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiConsumes, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRoleEnum } from '../common/types/roles';
import { RolesGuard } from '../common/guards/roles.guard';
import { UploadService } from './upload.service';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @ApiOperation({ summary: 'Upload an image' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = new Set([
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/avif',
        ]);
        if (!allowed.has(file.mimetype)) {
          return cb(new Error('Invalid file type. Only images are allowed.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.processImage(file);
  }

  @Post('cover')
  @ApiOperation({ summary: 'Upload a cover image (auto-cropped to 1200x630)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 8 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = new Set([
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/avif',
        ]);
        if (!allowed.has(file.mimetype)) {
          return cb(new Error('Invalid file type. Only images are allowed.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadCover(@UploadedFile() file: Express.Multer.File) {
    // Use UploadService to process cover via sharp
    return this.uploadService.processCover(file);
  }

  @Post('avatar')
  @ApiOperation({ summary: 'Upload an avatar image (auto-cropped to 256x256 square)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = new Set([
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'image/avif',
        ]);
        if (!allowed.has(file.mimetype)) {
          return cb(new Error('Invalid file type. Only images are allowed.'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return this.uploadService.processAvatar(file);
  }
}
