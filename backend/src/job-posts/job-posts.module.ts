import { Module } from '@nestjs/common';
import { JobPostsService } from './job-posts.service';
import { JobPostsController } from './job-posts.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPost } from './job-post.entity';
import { User } from '../users/entities/user.entity';
import { JobApplication } from '../job-applications/job-application.entity'; // Добавляем JobApplication
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CategoriesModule } from '../categories/categories.module';
import { ApplicationLimitsModule } from '../application-limits/application-limits.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPost, User, JobApplication]), // Добавляем JobApplication
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    CategoriesModule,
    ApplicationLimitsModule,
    SettingsModule,
  ],
  controllers: [JobPostsController],
  providers: [JobPostsService],
})
export class JobPostsModule {}