import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module'; // Добавляем ProfilesModule
import { RedisModule } from './redis/redis.module';
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
          synchronize: true,
        };
        console.log('Database Config:', dbConfig);
        return dbConfig;
      },
      inject: [ConfigService],
    }),
    UsersModule,
    AuthModule,
    ProfilesModule, // Добавляем ProfilesModule
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}