import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RedisModule } from './redis/redis.module';
import { User } from './users/entities/user.entity';
import { AppController } from './app.controller';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'onlinejobs_user',
      password: 'jgtzNxhokQYD',
      database: 'onlinejobs_db',
      entities: [User],
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    RedisModule,
  ],
  controllers: [AppController],
})
export class AppModule {}