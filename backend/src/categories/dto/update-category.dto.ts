import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateCategoryDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string | null;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  color?: string | null;
}
