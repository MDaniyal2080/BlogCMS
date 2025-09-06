import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import type { Response } from 'express';
import { PostsModule } from './posts/posts.module';
import { UploadModule } from './upload/upload.module';
import { SettingsModule } from './settings/settings.module';
import { TagsModule } from './tags/tags.module';
import { CategoriesModule } from './categories/categories.module';
import { CommentsModule } from './comments/comments.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Serve files under /uploads URL path from the local uploads directory
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: {
        setHeaders: (res: Response) => {
          // Allow cross-origin embedding of static assets (images)
          res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        },
      },
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PostsModule,
    CategoriesModule,
    TagsModule,
    SettingsModule,
    UploadModule,
    CommentsModule,
    NewsletterModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
