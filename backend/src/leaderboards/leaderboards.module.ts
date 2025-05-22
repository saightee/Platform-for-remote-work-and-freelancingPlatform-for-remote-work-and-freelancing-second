import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LeaderboardsService } from './leaderboards.service';
import { LeaderboardsController } from './leaderboards.controller';
import { Employer } from '../users/entities/employer.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { JwtModule } from '@nestjs/jwt'; // Добавляем
import { ConfigModule, ConfigService } from '@nestjs/config'; // Добавляем
import { AuthModule } from '../auth/auth.module'; // Добавляем

@Module({
  imports: [
    TypeOrmModule.forFeature([Employer, JobSeeker]),
    ConfigModule, // Добавляем
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    AuthModule, // Добавляем
  ],
  providers: [LeaderboardsService],
  controllers: [LeaderboardsController],
  exports: [LeaderboardsService],
})
export class LeaderboardsModule {}