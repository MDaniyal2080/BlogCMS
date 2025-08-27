import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePostDto {
  @IsString()
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  excerpt?: string | null;

  @IsString()
  content!: string;

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
  authorId?: string;

  @IsString()
  @IsOptional()
  markdown?: string;

  @IsBoolean()
  @IsOptional()
  featured?: boolean;

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
