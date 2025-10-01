import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeoController } from './seo.controller';
import { SeoService } from './seo.service';
import { JobPost } from '../job-posts/job-post.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPost]),
    CacheModule.register({ ttl: 60 * 60 * 24 }),
    ConfigModule,
  ],
  controllers: [SeoController],
  providers: [SeoService],
})
export class SeoModule {}
