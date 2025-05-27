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
import { UserFingerprint } from '../anti-fraud/entities/user-fingerprint.entity'; // Добавляем
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from '../users/users.module';
import { BlockedCountriesModule } from '../blocked-countries/blocked-countries.module';
import { SettingsModule } from '../settings/settings.module';
import { ApplicationLimitsModule } from '../application-limits/application-limits.module';
import { LeaderboardsModule } from '../leaderboards/leaderboards.module';
import { RedisModule } from '../redis/redis.module';
import { AntiFraudModule } from '../anti-fraud/anti-fraud.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, JobPost, Review, JobApplication, JobSeeker, Employer, ApplicationLimit, UserFingerprint]), // Добавляем UserFingerprint
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
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}