import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRoleEnum } from '../common/types/roles';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Get()
  @ApiOperation({ summary: 'List posts' })
  list(@Query() query: any) {
    return this.postsService.list(query);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a post by slug' })
  getBySlug(@Param('slug') slug: string) {
    return this.postsService.getBySlug(slug);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search posts' })
  search(@Query('q') q: string) {
    return this.postsService.search(q);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get posts stats for admin dashboard' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  stats() {
    return this.postsService.getStats();
  }

  @Get('scheduled')
  @ApiOperation({ summary: 'Admin: list upcoming scheduled posts' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  scheduled(
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const l = limit ? parseInt(limit, 10) : undefined;
    return this.postsService.getScheduled({ limit: l, from, to });
  }

  @Get('category/:slug')
  @ApiOperation({ summary: 'List posts by category slug' })
  getByCategory(@Param('slug') slug: string) {
    return this.postsService.getByCategorySlug(slug);
  }

  @Get('tag/:slug')
  @ApiOperation({ summary: 'List posts by tag slug' })
  getByTag(@Param('slug') slug: string) {
    return this.postsService.getByTagSlug(slug);
  }

  @Post(':id/view')
  @ApiOperation({ summary: 'Increment view count for a post' })
  incrementView(@Param('id') id: string) {
    return this.postsService.incrementView(id);
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related posts by categories/tags' })
  related(@Param('id') id: string, @Query('limit') limit?: string) {
    const lim = Math.max(1, Math.min(10, Number(limit) || 3));
    return this.postsService.getRelated(id, lim);
  }

  @Get(':id/prev-next')
  @ApiOperation({ summary: 'Get previous and next posts by publish date' })
  prevNext(@Param('id') id: string) {
    return this.postsService.getPrevNext(id);
  }

  // Place dynamic :id route after specific static routes to avoid shadowing
  @Get(':id')
  @ApiOperation({ summary: 'Get a post by id' })
  getById(@Param('id') id: string) {
    return this.postsService.getById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a post' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  create(@Body() body: CreatePostDto, @CurrentUser() user: any) {
    return this.postsService.create({ ...body, authorId: user?.userId });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a post' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  update(@Param('id') id: string, @Body() body: UpdatePostDto) {
    return this.postsService.update(id, body);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a post (creates a draft copy)' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  duplicate(@Param('id') id: string, @CurrentUser() user: any) {
    return this.postsService.duplicate(id, user?.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a post' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  remove(@Param('id') id: string) {
    return this.postsService.remove(id);
  }

  @Post('bulk/status')
  @ApiOperation({ summary: 'Bulk update status for posts' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  bulkStatus(
    @Body()
    body: { ids: string[]; status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'; publishedAt?: string }
  ) {
    const { ids, status, publishedAt } = body || ({} as any);
    return this.postsService.bulkUpdateStatus(ids || [], status, publishedAt);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete posts' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  bulkDelete(@Body() body: { ids: string[] }) {
    const { ids } = body || ({} as any);
    return this.postsService.bulkDelete(ids || []);
  }
}
