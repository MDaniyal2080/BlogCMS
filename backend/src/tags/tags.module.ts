import { Module } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [TagsController],
  providers: [TagsService, RolesGuard],
})
export class TagsModule {}
