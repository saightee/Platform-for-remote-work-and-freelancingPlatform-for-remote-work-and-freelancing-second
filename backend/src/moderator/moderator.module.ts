import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModeratorService } from './moderator.service';
import { ModeratorController } from './moderator.controller';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { Review } from '../reviews/review.entity';
import { Complaint } from '../complaints/complaint.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlatformFeedback } from '../platform-feedback/platform-feedback.entity';
import { PlatformFeedbackModule } from '../platform-feedback/platform-feedback.module';
import { PlatformFeedbackService } from '../platform-feedback/platform-feedback.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, JobPost, Review, Complaint, JobSeeker, Employer, PlatformFeedback]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
    PlatformFeedbackModule,
  ],
  
  controllers: [ModeratorController],
  providers: [ModeratorService, PlatformFeedbackService,],
})
export class ModeratorModule {}