import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  postId!: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  authorName?: string | null;

  @IsEmail()
  @IsOptional()
  @MaxLength(200)
  authorEmail?: string | null;

  @IsString()
  @MaxLength(5000)
  content!: string;

  // Honeypot field: must be absent or empty
  @IsString()
  @IsOptional()
  @MaxLength(0)
  honeypot?: string;
}
