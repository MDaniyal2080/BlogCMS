import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationsDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailOnComments?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  emailOnMentions?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  newsletter?: boolean;
}
