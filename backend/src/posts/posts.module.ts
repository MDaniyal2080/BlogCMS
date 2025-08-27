import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [PostsController],
  providers: [PostsService, RolesGuard],
})
export class PostsModule {}
