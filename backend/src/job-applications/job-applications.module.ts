import { Module } from '@nestjs/common';
import { JobApplicationsService } from './job-applications.service';
import { JobApplicationsController } from './job-applications.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobApplication } from './job-application.entity';
import { JobPost } from '../job-posts/job-post.entity';
import { User } from '../users/entities/user.entity';
import { JobSeeker } from '../users/entities/jobseeker.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ApplicationLimitsModule } from '../application-limits/application-limits.module';
import { ChatModule } from '../chat/chat.module';
import { ChatGateway } from '../chat/chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplication, JobPost, User, JobSeeker]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'mySuperSecretKey123!@#ForLocalDev2025'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    ApplicationLimitsModule,
    ChatModule, // Импортируем ChatModule
  ],
  controllers: [JobApplicationsController],
  providers: [
    JobApplicationsService,
    {
      provide: 'SOCKET_IO_SERVER',
      useFactory: (chatGateway: ChatGateway) => chatGateway.server,
      inject: [ChatGateway],
    },
  ],
})
export class JobApplicationsModule {}