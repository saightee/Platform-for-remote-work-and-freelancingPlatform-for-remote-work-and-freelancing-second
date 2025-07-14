import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { Review } from '../reviews/review.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { ApplicationLimit } from '../application-limits/application-limit.entity';
import { UserFingerprint } from '../anti-fraud/entities/user-fingerprint.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { BlockedCountriesModule } from '../blocked-countries/blocked-countries.module';
import { SettingsModule } from '../settings/settings.module';
import { ApplicationLimitsModule } from '../application-limits/application-limits.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';
import { RedisModule } from '../redis/redis.module';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { ComplaintsService } from '../complaints/complaints.service';
import { Complaint } from '../complaints/complaint.entity';
import { Feedback } from '../feedback/feedback.entity';
import { BlockedCountry } from '../blocked-countries/blocked-country.entity';
import { EmailModule } from '../email/email.module';
import { ChatModule } from '../chat/chat.module';
import { CategoriesModule } from '../categories/categories.module';
import { Category } from '../categories/category.entity';
import { PlatformFeedback } from '../platform-feedback/platform-feedback.entity';
import { Message } from '../chat/entities/message.entity';
@Module({
  imports: [
    TypeOrmModule.forFeature([User, JobPost, Review, Feedback, BlockedCountry, JobApplication, JobSeeker, Employer, ApplicationLimit, UserFingerprint, Complaint, PlatformFeedback, Category, Message]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    UsersModule,
    BlockedCountriesModule,
    SettingsModule,
    ApplicationLimitsModule,
    LeaderboardsModule,
    RedisModule,
    AntiFraudModule,
    ComplaintsModule,
    EmailModule,
    ChatModule,
    CategoriesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService, ComplaintsService],
})
export class AdminModule {}