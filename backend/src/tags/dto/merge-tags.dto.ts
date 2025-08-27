import { ArrayNotEmpty, IsArray, IsNotEmpty, IsString } from 'class-validator';

export class MergeTagsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  sourceIds!: string[];

  @IsString()
  @IsNotEmpty()
  targetId!: string;
}
