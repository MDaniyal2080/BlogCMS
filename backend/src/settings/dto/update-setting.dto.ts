import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @IsString()
  @IsNotEmpty()
  value!: string;

  @IsString()
  @IsOptional()
  type?: string;
}
