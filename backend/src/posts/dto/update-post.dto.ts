import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  IsIn,
} from 'class-validator';

export class UpdatePostDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string | null;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  featuredImage?: string | null;

  @IsString()
  @IsOptional()
  categoryId?: string | null;

  @IsArray()
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @IsOptional()
  tagIds?: string[];

  @IsBoolean()
  @IsOptional()
  published?: boolean;

  @IsString()
  @IsOptional()
  publishedAt?: string;

  @IsString()
  @IsOptional()
  markdown?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

  @IsString()
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

  @IsString()
  @IsOptional()
  metaTitle?: string | null;

  @IsString()
  @IsOptional()
  metaDescription?: string | null;

  @IsString()
  @IsOptional()
  metaKeywords?: string | null;
}
