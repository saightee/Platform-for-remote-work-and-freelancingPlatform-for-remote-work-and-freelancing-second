import { Module, forwardRef } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RedisModule } from '../redis/redis.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RedisService } from '../redis/redis.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { BlockedCountriesModule } from '../blocked-countries/blocked-countries.module';
import { AdminGuard } from './guards/admin.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { ModeratorGuard } from './guards/moderator.guard';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module';
import { EmailModule } from '../email/email.module';
import { AdminModule } from '../admin/admin.module';
import { AdminService } from '../admin/admin.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { Review } from '../reviews/review.entity';
import { JobApplication } from '../job-applications/job-application.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { ApplicationLimit } from '../application-limits/application-limit.entity';
import { UserFingerprint } from '../anti-fraud/entities/user-fingerprint.entity';
import { Complaint } from '../complaints/complaint.entity';
import { Category } from '../categories/category.entity';
import { Feedback } from '../feedback/feedback.entity';
import { PlatformFeedback } from '../platform-feedback/platform-feedback.entity';
import { Message } from '../chat/entities/message.entity';
import { EmailNotification } from '../email-notifications/email-notification.entity';
import { ReferralLink } from '../referrals/entities/referral-link.entity';
import { ReferralRegistration } from '../referrals/entities/referral-registration.entity';
import { SettingsModule } from '../settings/settings.module';
import { ApplicationLimitsModule } from '../application-limits/application-limits.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';
import { ComplaintsModule } from '../complaints/complaints.module';
import { ChatModule } from '../chat/chat.module';
import { CategoriesModule } from '../categories/categories.module';
import { StorageModule } from '../storage/storage.module';
import { AffiliateProgramModule } from '../affiliate-program/affiliate-program.module';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        return {
          secret: configService.get<string>('JWT_SECRET'),
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    BlockedCountriesModule,
    AntiFraudModule,
    EmailModule,
    SettingsModule,
    ApplicationLimitsModule,
    LeaderboardsModule,
    ComplaintsModule,
    ChatModule,
    CategoriesModule,
    forwardRef(() => AdminModule),
    AffiliateProgramModule,
    TypeOrmModule.forFeature([
      User,
      JobPost,
      Review,
      JobApplication,
      JobSeeker,
      Employer,
      ApplicationLimit,
      UserFingerprint,
      Complaint,
      Category,
      Feedback,
      PlatformFeedback,
      Message,
      EmailNotification,
      ReferralLink,
      ReferralRegistration,
    ]),
    StorageModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    RedisService,
    GoogleAuthGuard,
    AdminGuard,
    ModeratorGuard,
    {
      provide: 'MAILER_TRANSPORT',
      useFactory: (configService: ConfigService) => {
        return nodemailer.createTransport({
          host: configService.get<string>('SMTP_HOST'),
          port: configService.get<number>('SMTP_PORT', 587),
          auth: {
            user: configService.get<string>('SMTP_USER'),
            pass: configService.get<string>('SMTP_PASS'),
          },
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [JwtModule, AdminGuard, ModeratorGuard],
})
export class AuthModule {}