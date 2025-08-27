import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AppRoleEnum } from '../../common/types/roles';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'username' })
  @IsString()
  @MinLength(3)
  username: string;

  @ApiProperty({ example: 'Str0ngP@ssword!' })
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).{8,}$/,
    { message: 'Password must be at least 8 characters and include upper, lower, number, and special character' }
  )
  password: string;

  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ enum: AppRoleEnum, default: AppRoleEnum.ADMIN })
  @IsOptional()
  @IsEnum(AppRoleEnum)
  role?: AppRoleEnum;
}
