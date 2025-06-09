import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StatsService } from './stats.service';
import { StatsController } from './stats.controller';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, JobPost])],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}