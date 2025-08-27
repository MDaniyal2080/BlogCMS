import { IsBoolean } from 'class-validator';

export class UpdateCommentApprovalDto {
  @IsBoolean()
  approved!: boolean;
}
