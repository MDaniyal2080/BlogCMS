import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import type { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRoleEnum } from '../common/types/roles';
import { UpdateCommentApprovalDto } from './dto/update-comment-approval.dto';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get('by-post/:postId')
  @ApiOperation({ summary: 'List approved comments for a post' })
  listByPost(
    @Param('postId') postId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : undefined;
    const o = offset ? parseInt(offset, 10) : undefined;
    return this.commentsService.listByPost(postId, { limit: l, offset: o });
  }

  @Post()
  @ApiOperation({ summary: 'Create a comment' })
  create(@Body() body: CreateCommentDto, @Req() req: Request) {
    const ip =
      req.headers['x-forwarded-for']?.toString().split(',')[0].trim() || req.ip;
    return this.commentsService.create(body, ip);
  }

  // Admin moderation endpoints
  @Get('admin')
  @ApiOperation({ summary: 'Admin: list comments with filters' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  adminList(
    @Query('postId') postId?: string,
    @Query('approved') approved?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : undefined;
    const o = offset ? parseInt(offset, 10) : undefined;
    const a = typeof approved === 'string' ? approved === 'true' : undefined;
    return this.commentsService.adminList({
      postId,
      approved: a,
      limit: l,
      offset: o,
    });
  }

  @Patch(':id/approve')
  @ApiOperation({ summary: 'Admin: approve/unapprove a comment' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  setApproval(@Param('id') id: string, @Body() body: UpdateCommentApprovalDto) {
    return this.commentsService.setApproval(id, body.approved);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Admin: delete a comment' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  remove(@Param('id') id: string) {
    return this.commentsService.remove(id);
  }
}
