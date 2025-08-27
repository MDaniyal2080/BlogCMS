import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AppRoleEnum } from '../common/types/roles';
import { RolesGuard } from '../common/guards/roles.guard';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List categories' })
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get category by id' })
  findOne(@Param('id') id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create category' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  create(@Body() body: CreateCategoryDto) {
    return this.categoriesService.create(body);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update category' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  update(@Param('id') id: string, @Body() body: UpdateCategoryDto) {
    return this.categoriesService.update(id, body);
  }

  @Post('reorder')
  @ApiOperation({ summary: 'Reorder categories' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN, AppRoleEnum.EDITOR)
  reorder(@Body('ids') ids: string[]) {
    return this.categoriesService.reorder(ids);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete category' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(AppRoleEnum.ADMIN)
  remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
