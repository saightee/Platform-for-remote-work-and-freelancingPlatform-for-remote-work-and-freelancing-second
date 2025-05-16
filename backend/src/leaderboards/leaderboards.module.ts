import { Module } from '@nestjs/common';
import { LeaderboardsService } from './leaderboards.service';
import { LeaderboardsController } from './leaderboards.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { AuthModule } from '../auth/auth.module'; // Добавляем

@Module({
  imports: [
    TypeOrmModule.forFeature([User, JobPost, JobApplication]),
    AuthModule, // Добавляем
  ],
  controllers: [LeaderboardsController],
  providers: [LeaderboardsService],
})
export class LeaderboardsModule {}