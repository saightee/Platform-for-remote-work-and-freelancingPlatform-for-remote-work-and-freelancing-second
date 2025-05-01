import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    UsersModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: 'mySuperSecretKey123!@#ForLocalDev2025',
      signOptions: { expiresIn: '1h' },
    }),
    RedisModule, // Добавляем RedisModule
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}