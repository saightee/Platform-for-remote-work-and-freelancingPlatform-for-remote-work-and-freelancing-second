import { Module } from '@nestjs/common';
import { AuthService } from './auth.service'; // Исправляем: убираем пробел
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RedisModule } from '../redis/redis.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { LinkedInStrategy } from './strategies/linkedin.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RedisService } from '../redis/redis.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { BlockedCountriesModule } from '../blocked-countries/blocked-countries.module';
import { AdminGuard } from './guards/admin.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        console.log('JWT_SECRET from ConfigService:', configService.get<string>('JWT_SECRET'));
        return {
          secret: configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
          signOptions: { expiresIn: '1h' },
        };
      },
      inject: [ConfigService],
    }),
    RedisModule,
    BlockedCountriesModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    GoogleStrategy,
    JwtStrategy,
    RedisService,
    GoogleAuthGuard,
    // LinkedInStrategy,
    AdminGuard,
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
  exports: [JwtModule, AdminGuard],
})
export class AuthModule {}