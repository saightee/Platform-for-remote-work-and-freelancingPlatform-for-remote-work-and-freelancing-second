import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Message } from './entities/message.entity';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { JobApplication } from '../job-applications/job-application.entity';
import { User } from '../users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '../redis/redis.module';
import { ChatController } from './chat.controller';
import { ChatNotificationsService } from './chat-notifications.service';
import { SettingsModule } from '../settings/settings.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Message, JobApplication, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    RedisModule,
    SettingsModule,
    EmailModule,
  ],
  controllers: [ChatController],
  providers: [ChatGateway, ChatService, ChatNotificationsService],
  exports: [ChatGateway, ChatService],
})
export class ChatModule {}