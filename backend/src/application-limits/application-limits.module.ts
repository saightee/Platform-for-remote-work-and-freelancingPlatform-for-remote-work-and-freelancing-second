import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationLimit } from './application-limit.entity';
import { ApplicationLimitsService } from './application-limits.service';
import { JobApplication } from '../job-applications/job-application.entity';
import { JobPost } from '../job-posts/job-post.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicationLimit, JobApplication, JobPost])],
  providers: [ApplicationLimitsService],
  exports: [ApplicationLimitsService],
})
export class ApplicationLimitsModule {}