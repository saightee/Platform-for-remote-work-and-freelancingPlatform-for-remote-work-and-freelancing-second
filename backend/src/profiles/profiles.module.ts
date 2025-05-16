import { Module } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { ProfilesController } from './profiles.controller';
import { AdminProfilesController } from './profiles.controller'; // Добавляем
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { Employer } from '../users/entities/employer.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ReviewsModule } from '../reviews/reviews.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, JobSeeker, Employer]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    ReviewsModule,
  ],
  controllers: [ProfilesController, AdminProfilesController], // Добавляем AdminProfilesController
  providers: [ProfilesService],
})
export class ProfilesModule {}