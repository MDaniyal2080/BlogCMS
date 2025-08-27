import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService, RolesGuard],
})
export class CategoriesModule {}
