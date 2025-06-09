import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MulterModule } from '@nestjs/platform-express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { JobPostsModule } from './job-posts/job-posts.module';
import { CategoriesModule } from './categories/categories.module';
import { JobApplicationsModule } from './job-applications/job-applications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AdminModule } from './admin/admin.module';
import { FeedbackModule } from './feedback/feedback.module';
import { RedisModule } from './redis/redis.module';
import { BlockedCountriesModule } from './blocked-countries/blocked-countries.module';
import { LeaderboardsModule } from './leaderboards/leaderboards.module';
import { ApplicationLimitsModule } from './application-limits/application-limits.module';
import { TalentsModule } from './talents/talents.module';
import { ComplaintsModule } from './complaints/complaints.module';
import { StatsModule } from './stats/stats.module';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        const dbConfig: TypeOrmModuleOptions = {
          type: 'postgres',
          host: configService.get('POSTGRES_HOST', 'localhost'),
          port: +configService.get('POSTGRES_PORT', 5432),
          username: configService.get('POSTGRES_USER', 'onlinejobs_user'),
          password: configService.get('POSTGRES_PASSWORD', 'onlinejobs123'),
          database: configService.get('POSTGRES_DB', 'onlinejobs_db'),
          autoLoadEntities: true,
          synchronize: false,
          migrations: ['dist/migration/*.js'],
          migrationsRun: true,
        };
        console.log('Database Config:', dbConfig);
        return dbConfig;
      },
      inject: [ConfigService],
    }),
    MulterModule.register({
      dest: './uploads',
    }),
    UsersModule,
    AuthModule,
    ProfilesModule,
    JobPostsModule,
    CategoriesModule,
    JobApplicationsModule,
    ReviewsModule,
    AdminModule,
    FeedbackModule,
    RedisModule,
    BlockedCountriesModule,
    LeaderboardsModule,
    ApplicationLimitsModule,
    TalentsModule,
    ComplaintsModule,
    StatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}