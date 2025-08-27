import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TagsService } from './tags.service';
import { CreateTagDto } from './dto/create-tag.dto';
import { UpdateTagDto } from './dto/update-tag.dto';
import { MergeTagsDto } from './dto/merge-tags.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRoleEnum } from '../common/types/roles';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('tags')
@Controller('tags')
export class TagsController {
  constructor(private readonly tagsService: TagsService) {}

  @Get()
  @ApiOperation({ summary: 'List all tags (optional search with ?q=)' })
  findAll(@Query('q') q?: string) {
    return this.tagsService.findAll(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tag by id' })
  findOne(@Param('id') id: string) {
    return this.tagsService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create tag' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  create(@Body() body: CreateTagDto) {
    return this.tagsService.create(body);
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge source tags into a target tag' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  merge(@Body() body: MergeTagsDto) {
    return this.tagsService.merge(body.sourceIds, body.targetId);
  }

  @Post('cleanup-unused')
  @ApiOperation({ summary: 'Delete tags that are not used by any posts' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  cleanupUnused() {
    return this.tagsService.cleanupUnused();
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update tag' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  update(@Param('id') id: string, @Body() body: UpdateTagDto) {
    return this.tagsService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete tag' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  remove(@Param('id') id: string) {
    return this.tagsService.remove(id);
  }
}
